var $ = require('interlude')
  , GroupStage = require('groupstage')
  , Base = require('tournament');

// for grouped breakers
function Id(s, r, m, isSimple) {
  this.s = s;
  this.r = r;
  this.m = m;
  Object.defineProperty(this, '_simple', {
    value: isSimple
  });
}
Id.prototype.toString = function () {
  return this._simple ?
    'S' + this.s + ' TB' :
    'S' + this.s + ' TB R' + this.r + ' M' + this.m;
};

var simpleId = function (s) {
  return new Id(s, 1, 1, true);
};

// ------------------------------------------------------------------
// Init helpers
// ------------------------------------------------------------------

var createClusters = function (posAry, limit, breakOneUp) {
  var numSections = posAry.length;
  var position = Math.ceil(limit / numSections);

  return posAry.map(function (seedAry) {
    var unchosen = position;
    // need a match in this section if no clear position-placer
    for (var i = 0; unchosen > 0; i += 1) {
      var xps = seedAry[i];
      var needForBetween = xps.length >1 && xps.length === unchosen && breakOneUp;
      if (xps.length > unchosen || needForBetween) {
        return xps.slice();
      }
      unchosen -= xps.length; // next cluster must be smaller to fit
    }
    return []; // nothing to break this section
  });
};

var createGroupStageBreaker = function (cluster, section, gsOpts) {
  var gs = new GroupStage(cluster.length, gsOpts);
  gs.tbSection = section;
  gs.matches.forEach(function (m) {
    // NB: cannot modify section as GroupStage relies on it being < numGroups
    m.p.forEach(function (oldSeed, i) {
      // but can safely modify seeds in match - equivalent to using .from
      m.p[i] = cluster[oldSeed-1];
    });
  });
  return gs;
};

var createFfaBreaker = function (cluster, section) {
  return { id: simpleId(section), p: cluster };
};

var createMatches = function (posAry, limit, opts) {
  var xs = [];
  createClusters(posAry, limit, opts.breakForBetween).forEach(function (ps, i) {
    if (ps.length) {
      var matchMaker = opts.grouped ? createGroupStageBreaker : createFfaBreaker;
      xs.push(matchMaker(ps, i+1, opts.groupOpts));
    }
  });
  return xs;
};

// ------------------------------------------------------------------
// results / rawPositions helpers
// ------------------------------------------------------------------

// NB: expects instance context
var getWithinBreakerScore = function (section) {
  if (!this.grouped) {
    var ffaM = this.findMatch({ s: section, r: 1, m: 1 });
    return (ffaM && ffaM.m) ? ffaM : null;
  }

  var gs = $.firstBy(function (stage) {
    return stage.tbSection === section;
  }, this.groupStages);

  if (gs == null || !gs.isDone()) {
    return null;
  }
  var gsRes = gs.results();
  var positions = gs.rawPositions(gsRes);
  var match = { p: [], m: [] }; // match equivalent
  // convert from rawPosition - only used by matchTieCompute in updater
  positions[0].forEach(function (xps, x) {
    xps.forEach(function (p) {
      match.p.push(p);
      match.m.push(positions[0].length-x);
    });
  });
  return match;
};

// split up the posAry entried cluster found in corresponding within section breakers
var updateSeedAry = function (seedAry, match) {
  var res = $.replicate(seedAry.length, []);
  seedAry.forEach(function (xps, x) {
    // NB: while we are not writing 1-1 from seedAry to res, we are always
    // making sure not to overwrite what we had in previous iterations
    if (xps.indexOf(match.p[0]) < 0) {
      res[x] = res[x].concat(xps);
      return;
    }
    // always tieCompute match because only strict mode has guaranteed non-ties
    var sorted = $.zip(match.p, match.m).sort(Base.compareZip);
    Base.matchTieCompute(sorted, 0, function (p, pos) {
      res[x+pos-1].push(p);
    });
  });
  return res;
};

// ------------------------------------------------------------------
// Interface
// ------------------------------------------------------------------

function TieBreaker(oldRes, posAry, limit, opts) {
  if (!(this instanceof TieBreaker)) {
    return new TieBreaker(oldRes, posAry, limit, opts);
  }
  this._opts = TieBreaker.defaults(opts);
  var invReason = TieBreaker.invalid(oldRes, posAry, this._opts, limit);
  if (invReason !== null) {
    this._opts.log.error('Invalid %d player TieBreaker with oldRes=%j rejected, opts=%j',
      limit, oldRes, this._opts
    );
    throw new Error('Cannot construct TieBreaker: ' + invReason);
  }

  var xs = createMatches(posAry, limit, this._opts);
  var ms = [];
  if (this._opts.grouped) {
    for (var i = 0; i < xs.length; i += 1) {
      for (var j = 0; j < xs[i].matches.length; j += 1) {
        var m = xs[i].matches[j];
        // NB: modifying the matches here so that outside world sees the section
        // corr. to the section they came from - whereas gs inst needs s === 1
        ms.push({
          id: new Id(xs[i].tbSection, m.id.r, m.id.m),
          p: m.p.slice()
        });
      }
    }
    this.groupStages = xs;
  }
  else {
    ms = xs;
  }

  Base.call(this, oldRes.length, ms);
  this.name = 'TieBreaker';
  this.grouped = this._opts.grouped;
  this.strict = this._opts.strict;
  this.posAry = posAry;
  this.limit = limit;
  this.oldRes = oldRes;
  this.numSections = posAry.length;
  this.sectionSize = $.flatten(posAry[0]).length;
  this.betweenPosition = Math.ceil(this.limit / this.numSections);

  // Demote player positions until we are done

  // Demotion must unfortunately happen here, and not in previous tourneys results.
  // This is because demotion will change depending on what limits we choose.
  // While this means if we bypass TB we may end up forwarding unfairly (perhaps
  // more players from one group than another), TB is here to fix it, so use it.
  var pls = this.players(); // the players that are actually in matches here
  this.numPlayers = pls.length; // override this.numPlayers set via Base.call(this)
  var playersGuaranteed = oldRes.filter(function (r) {
    return pls.indexOf(r.seed) < 0 && r.pos <= limit;
  }).length;
  oldRes.forEach(function (r) {
    if (pls.indexOf(r.seed) >= 0) {
      r.pos = pls.length + playersGuaranteed;
    }
  });
}
Base.inherit(TieBreaker);

// ------------------------------------------------------------------
// Static helpers
// ------------------------------------------------------------------

// custom invalid that doesn't call inherited versions (because different ctor args)
TieBreaker.invalid = function (oldRes, posAry, opts, limit) {
  if (!Array.isArray(oldRes)) {
    return 'results must be implemented';
  }
  if (!Array.isArray(posAry) || !posAry.length) {
    return 'rawPositions must be implemented properly';
  }
  if (!Base.isInteger(limit) || limit < 1 || limit >= oldRes.length) {
    return 'limit must be an integer in {1, ..., previous.numPlayers}';
  }
  if (limit % posAry.length !== 0) {
    return 'number of sections must divide limit';
  }
  oldRes.forEach(function (r) {
    if (![r.seed, r.for, r.pos].every(Base.isInteger)) {
      return 'invalid results format - common properties missing';
    }
  });
  var len = posAry[0].length;
  var s0Len = $.flatten(posAry[0]).length;
  posAry.forEach(function (seedAry) {
    seedAry.forEach(function (p) {
      if (!Base.isInteger(p) || p <= Base.NONE) {
        return 'invalid rawPositions - all entries must be arrays of integers';
      }
    });
    if (Math.abs(seedAry.length - len) > 1) { // allow diff of 1
      return 'rawPositions must be ~equally long for every section';
    }
    if (Math.abs($.flatten(seedAry).length - s0Len) > 1) { // ditto
      return 'rawPositions must contain ~equally many players per section';
    }
  });
  return null;
};

TieBreaker.defaults = function (opts) {
   // Call defaults from other classes manually + dont modify input
  var o = Base.defaults(Math.Infinity, opts || {});
  o.breakForBetween = Boolean(o.breakForBetween);
  o.grouped = Boolean(o.grouped);
  o.groupOpts = o.grouped ? GroupStage.defaults(Math.Infinity, o.groupOpts) : {};
  delete o.groupOpts.groupSize; // all subgroups must be ONE group only
  delete o.groupOpts.log;
  // grouped tiebreakers cannot be strict
  o.strict = Boolean(o.strict) && !o.grouped;
  return o;
};

// custom from because TieBreaker has different constructor arguments
TieBreaker.from = function (inst, numPlayers, opts) {
  var err = 'Cannot forward from ' + inst.name + ': ';
  if (!inst.isDone()) {
    throw new Error(err + 'tournament not done');
  }
  var res = inst.results();
  if (res.length < numPlayers) {
    throw new Error(err + 'not enough players');
  }
  if (!inst.rawPositions) {
    throw new Error(inst.name + ' does not implement rawPositions');
  }
  var posAry = inst.rawPositions(res);

  // NB: no replacing for TieBreaker, everything read from results
  return new TieBreaker(res, posAry, numPlayers, opts);
};

TieBreaker.isNecessary = function (inst, numPlayers, opts) {
  var o = TieBreaker.defaults(opts);
  var posAry = inst.rawPositions(inst.results());
  var hasNonEmptyCluster = function (cluster) {
    return cluster.length > 0;
  };
  var clusters = createClusters(posAry, numPlayers, o.breakForBetween);
  return clusters.some(hasNonEmptyCluster);
};

// ------------------------------------------------------------------
// Expected methods
// ------------------------------------------------------------------

TieBreaker.prototype._verify =  function (match, score) {
  if (this.strict && $.nub(score).length !== score.length) {
    return 'scores must unambiguously decide every position in strict mode';
  }
  return null;
};

// can always rescore matches since we don't propagate to between group breakers
TieBreaker.prototype._safe = $.constant(true);

TieBreaker.prototype._progress = function (match) {
  if (this.grouped) {
    var gs = $.firstBy(function (stage) {
      return stage.tbSection === match.id.s;
    }, this.groupStages);
    var oldId = { s: 1, r: match.id.r, m: match.id.m };
    gs.score(oldId, match.m);
  }
};

var compareResults = function (x, y) {
  var xScore = x.for - (x.against || 0);
  var yScore = y.for - (y.against || 0);
  return (y.pts - x.pts) || (yScore - xScore) || (x.seed - y.seed);
};

var finalCompare = function (x, y) {
  if (x.pos !== y.pos) {
    return x.pos - y.pos;
  }
  return compareResults(x, y);
};

var positionAcross = function (xarys) {
  // always tie between groups like in groupstage - we dont make inferences
  var posctr = 1;
  xarys.forEach(function (xplacers) {
    xplacers.sort(compareResults);
    xplacers.forEach(function (r) {
      r.pos = posctr;
    });
    posctr += xplacers.length;
  });
};

// override results because we need to do it all from scratch
TieBreaker.prototype.results = function () {
  var res = this.oldRes.map(function (r) {
    return $.extend({}, r); // deep copy to avoid modifying oldRes
  });
  // NB: we do not care about stats from the matches apart from what it broke

  // gposition based on updated posAry from rawPositions - and create xarys
  var xarys = $.replicate(this.sectionSize, []);
  this.rawPositions().forEach(function (seedAry) {
    seedAry.forEach(function (gxp, x) {
      gxp.forEach(function (s) {
        var resEl = Base.resultEntry(res, s);
        resEl.gpos = x+1;
        xarys[x].push(resEl);
      });
    });
  });

  if (this.isDone()) {
    positionAcross(xarys);
  }

  return res.sort(finalCompare);
};

TieBreaker.prototype.rawPositions = function () {
  var findScores = getWithinBreakerScore.bind(this);
  return this.posAry.map(function (seedAry, i) {
    var match = findScores(i+1);
    return match == null ? seedAry : updateSeedAry(seedAry, match);
  });
};

TieBreaker.Id = Id;
module.exports = TieBreaker;

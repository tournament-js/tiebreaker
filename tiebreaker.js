var $ = require('interlude')
  , Base = require('tournament');

//------------------------------------------------------------------
// Match helpers
//------------------------------------------------------------------

/**
 * This creates 2 kind of tiebreakers
 * 1. Within sections (necessary for the latter)
 * 2. Between sections
 *
 * This will cause at most two FFA matches || mini subgroupstages for each player:
 * 1. One for the group/section cluster (to break on gpos) if needed
 * 2. One for the between group/section cluster of xplacers (limit % numSections > 0)
 */

var createMatches = function (posAry, limit) {
  var numSections = posAry.length;
  var position = Math.ceil(limit / numSections);
  var ms = [];
  var rem = limit % numSections;
  //console.log('lim pos', position, posAry);

  // within section matches
  for (var k = 0; k < numSections; k += 1) {
    var seedAry = posAry[k];
    var unchosen = position;
    // need a match in this section if no clear position-placer

    for (var i = 0; unchosen > 0; i += 1) {
      var xps = seedAry[i];
      var needForBetween = xps.length > 1 && xps.length === unchosen && rem > 0;
      if (xps.length > unchosen || needForBetween) {
        ms.push({ id: { s: k+1, r: 1, m: 1 }, p: xps.slice() });
        break;
      }
      unchosen -= xps.length; // next cluster must be smaller to fit
    }
  }

  // between section match
  if (rem > 0) {
    var ps = posAry.map(function (seedAry) {
      var cluster = seedAry[position-1];
      return (cluster.length === 1) ? cluster[0] : Base.NONE ;
    });
    ms.push({ id: { s: numSections+1, r: 1, m: 1 }, p: ps });
  }

  return ms;
};

// split up the posAry entried cluster found in corresponding within section breakers
// TODO: extend for subgrouped..
// TODO: need a way to convert grouped results to match-like results for this
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
      if (res[x+pos-1] == null) {
        throw new Error("weird index x=" + x + " +pos="+pos+"-1 wth seedArylen"+seedAry.length);
      }
      res[x+pos-1].push(p);
    });
  });
  return res;
};

//------------------------------------------------------------------
// Interface
//------------------------------------------------------------------

function TieBreaker(oldRes, posAry, limit, opts) {
  if (!(this instanceof TieBreaker)) {
    return new TieBreaker(oldRes, posAry, limit, opts);
  }
  opts = TieBreaker.defaults(opts);
  var invReason = TieBreaker.invalid(oldRes, posAry, opts, limit);
  if (invReason !== null) {
    console.error("Invalid %d player TieBreaker with oldRes=%j rejected, opts=%j",
      limit, oldRes, opts
    );
    throw new Error("Cannot construct TieBreaker: " + invReason);
  }
  this.nonStrict = opts.nonStrict;
  Base.call(this, oldRes.length, createMatches(posAry, limit));

  this.posAry = posAry;
  this.limit = limit;
  this.oldRes = oldRes;
  this.numSections = posAry.length;
  this.groupSize = $.flatten(posAry[0]).length; // TODO: rename size
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

//------------------------------------------------------------------
// Static helpers
//------------------------------------------------------------------

// custom invalid that doesn't call inherited versions (because different ctor args)
TieBreaker.invalid = function (oldRes, posAry, opts, limit) {
  if (!Array.isArray(oldRes)) {
    return "results must be implemented";
  }
  if (!Array.isArray(posAry) || !posAry.length) {
    return "rawPositions must be implemented properly";
  }
  if (!Base.isInteger(limit) || limit < 1 || limit >= oldRes.length) {
    return "limit must be an integer in the range {1, ... ,results.length-1}";
  }
  oldRes.forEach(function (r) {
    if (![r.seed, r['for'], r.pos].every(Base.isInteger)) {
      return "invalid results format - common properties missing";
    }
  });
  var len = posAry[0].length;
  var s0Len = $.flatten(posAry[0]).length;
  posAry.forEach(function (seedAry) {
    seedAry.forEach(function (p) {
      if (!Base.isInteger(p) || p <= Base.NONE) {
        return "invalid rawPositions - all entries must be arrays of integers";
      }
    });
    if (Math.abs(seedAry.length - len) > 1) { // allow diff of 1
      return "rawPositions must be ~equally long for every section";
    }
    if (Math.abs($.flatten(seedAry).length - s0Len) > 1) { // ditto
      return "rawPositions must contain ~equally many players per section";
    }
  });
  return null;
};

TieBreaker.defaults = function (opts) {
  opts = opts || {};
  opts.subgrouped = Boolean(opts.subgrouped);
  // NB: subgrouped tiebreakers MUST be nonStrict
  opts.nonStrict = Boolean(opts.nonStrict) || opts.subgrouped;
  return opts;
};

// because between breakers are at numSections+1, idString need to be bound
// this breaks tournament assumptions - need to think about this
// may have to extend ids further :(
//TieBreaker.idString = function (id) {
//  var str = (id.s <= this.numSections) ?
//    "S " + id.s + " TB" :
//    "Between TB";
//  return str + " R" + id.r + " M" + id.m;
//};

// custom from because TieBreaker has different constructor arguments
TieBreaker.from = function (inst, numPlayers, opts) {
  var err = "Cannot forward from " + inst.name + ": ";
  if (!inst.isDone()) {
    throw new Error(err + "tournament not done");
  }
  var res = inst.results();
  if (res.length < numPlayers) {
    throw new Error(err + "not enough players");
  }
  if (!inst.rawPositions) {
    throw new Error(inst.name + " does not implement rawPositions");
  }
  var posAry = inst.rawPositions(res);

  // NB: no replacing for TieBreaker, everything read from results
  return new TieBreaker(res, posAry, numPlayers, opts);
};

//------------------------------------------------------------------
// Expected methods
//------------------------------------------------------------------

TieBreaker.prototype._verify =  function (match, score) {
  if (!this.nonStrict && $.nub(score).length !== score.length) {
    return "scores must unambiguously decide every position in strict mode";
  }
  return null;
};

TieBreaker.prototype._progress = function (match) {
  // within section done => move correct player to between section if it exists
  var betweenMatch = this.findMatch({ s: this.numSections+1, r: 1, m: 1 });
  if (match.id.s <= this.numSections && betweenMatch) {
    var g = match.id.s - 1;
    var seedAry = updateSeedAry(this.posAry[g], match);
    betweenMatch.p[g] = seedAry[this.betweenPosition-1][0];
  }
};

var compareResults = function (x, y) {
  if (x.tb != null && y.tb != null) {
    return y.tb - x.tb;
  }
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

// we only use tieCompute break up xplacers if there were between tiebreakers
var tieCompute = function (resAry, startPos, cb) {
  Base.resTieCompute(resAry, startPos, cb, $.get('tb'));
};

var positionAcross = function (xarys) {
  // tieCompute across groups via xplacers to get the `pos` attribute
  // same as GroupStage procedure except we can split up ties between sections
  var posctr = 0;
  xarys.forEach(function (xplacers) {
    xplacers.sort(compareResults);
    tieCompute(xplacers, posctr, function (r, pos) {
      r.pos = pos;
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
  var xarys = $.replicate(this.groupSize, []);
  this.rawPositions().forEach(function (seedAry) {
    seedAry.forEach(function (gxp, x) {
      gxp.forEach(function (s) {
        var resEl = Base.resultEntry(res, s);
        resEl.gpos = x+1;
        xarys[x].push(resEl);
      });
    });
  });

  // inspect between section tiebreaker
  var betweenMatch = this.findMatch({ s: this.numSections+1, r: 1, m: 1 });
  if (betweenMatch && betweenMatch.m) {
    betweenMatch.p.forEach(function (p, i) {
      Base.resultEntry(res, p).tb = betweenMatch.m[i];
    });
  }

  if (this.isDone()) {
    positionAcross(xarys);
  }

  return res.sort(finalCompare);
};

TieBreaker.prototype.rawPositions = function () {
  var findMatch = this.findMatch.bind(this);
  return this.posAry.map(function (seedAry, i) {
    var m = findMatch({ s: i+1, r: 1, m: 1 });
    return (m && m.m) ? updateSeedAry(seedAry, m) : seedAry.slice();
  });
};

module.exports = TieBreaker;

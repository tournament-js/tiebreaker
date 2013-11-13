var $ = require('interlude')
  , Base = require('tournament');

//------------------------------------------------------------------
// Match helpers
//------------------------------------------------------------------

/**
 * FFA tiebreakers
 *
 * creates 2 kind of tiebreakers
 * 1. Within sections (necessary for the latter)
 * 2. Between sections
 *
 * Because of the complexity of possibly doing the tiebreaker matches
 * in a non-FFA format is astounding (ties force more tbs),
 * we leave this up to the host and enforce no ties in each match.
 *
 * Thus we only provide at most 2 matches for each player:
 * 1. One match FOR EACH SECTION (if needed) to break each group/section
 * 2. One match for the between section x-placers if numSections%limit !== 0
 *
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
      // TODO: new loop can crash here if badly created posAry
      var xps = seedAry[i];
      var needForBetween = xps.length > 1 && xps.length === unchosen && rem > 0;
      if (xps.length > unchosen || needForBetween) {
        ms.push({ id: { s: 0, r: 1, m: k+1 }, p: xps.slice() });
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
    ms.push({ id: { s: 0, r: 2, m: 1 }, p: ps });
  }

  return ms;
};

// split up the posAry entried cluster found in corresponding r1 match
var updateSeedAry = function (seedAry, match) {
  var res = [];
  seedAry.forEach(function (xps, x) {
    if (xps.indexOf(match.p[0]) >= 0) {
      // split match up into match.p.length new sets of xplacers
      return Base.sorted(match).forEach(function (s, i) {
        res[x+i] = [s];
      });
    }
    // copy if not already filled in in earlier iteration
    res[x] = res[x] || xps.slice();
  });
  return res;
};

//------------------------------------------------------------------
// Interface
//------------------------------------------------------------------

// TODO: opts.nonStrict default false
// TODO: opts.mode default FFA (should be able to GS replace if nonStrict)
// TODO: note that .pts not always present in results()
function TieBreaker(oldRes, posAry, limit, opts) {
  if (!(this instanceof TieBreaker)) {
    return new TieBreaker(oldRes, limit);
  }
  var invReason = TieBreaker.invalid(oldRes, posAry, limit);
  if (invReason !== null) {
    console.error("Invalid %d player TieBreaker with oldRes=%j rejected",
      limit, oldRes
    );
    throw new Error("Cannot construct TieBreaker: " + invReason);
  }
  this.numGroups = posAry.length; // TODO: rename to numSections
  this.groupSize = $.flatten(posAry[0]).length; // TODO: rename size
  this.posAry = posAry;
  this.limit = limit;
  this.oldRes = oldRes;
  Base.call(this, createMatches(this.posAry, limit));
  var pls = this.players();

  // demote player positions until we are done
  // TODO: this SHOULD REALLY be done in groupstage
  // because if we happen to try to forward an amount that matches up, we may
  // forward severly unfairly (based on tied xplacers)
  this.numPlayers = pls.length; // need to match uph
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
TieBreaker.invalid = function (oldRes, posAry, limit) {
  if (!Array.isArray(oldRes)) {
    return "results must be implemented";
  }
  if (!Array.isArray(posAry)) {
    return "rawPositions must be implemented";
  }
  if (!Base.isInteger(limit) || limit < 1 || limit >= oldRes.length) {
    return "limit must be an integer in the range {1, ... ,results.length-1}";
  }
  for (var i = 0; i < oldRes.length; i += 1) {
    var r = oldRes[i];
    var props = [r.seed, r['for'], r.pos];
    if (!props.every(Base.isInteger)) {
      return "invalid results format - common properties missing";
    }
  }
  var len = posAry[0].length;
  for (var j = 0; j < posAry.length; j += 1) {
    //if (!posAry[j].every(Base.isInteger)) {
    // TODO: should check this, but need to map check to make work
    //  return "invalid rawPositions - must all be integers"
    //}
    if (Math.abs(posAry[j].length - len) > 1) { // allow diff of 1
      return "rawPositions must be equally long for every section";
    }
  }
  return null;
};

TieBreaker.idString = function (id) {
  if (id.r === 1) {
    return "Group " + id.m + " tiebreaker";
  }
  return "Between groups tiebreaker";
};

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
  //var luckies = res.filter(function (r) {
  //  return r.pos <= numPlayers;
  //});
  //if (luckies.length === numPlayers) {
  //  console.warn('unnecessary %dp TieBreaker construction from', numPlayers, inst.name);
  //  console.log(res);
  //}
  if (!inst.rawPositions) {
    throw new Error(inst.name + " does not implement rawPositions");
  }
  var posAry = inst.rawPositions(res);
  //console.log(numPlayers, posAry);

  // NB: construction automatically guards on invalid
  var forwarded = new TieBreaker(res, posAry, numPlayers, opts);
  // NB: no replacing for TieBreaker, everything read from results
  return forwarded;
};

//------------------------------------------------------------------
// Expected methods
//------------------------------------------------------------------

TieBreaker.prototype._verify =  function (match, score) {
  if ($.nub(score).length !== score.length) {
    return "scores must unambiguously decide every position";
  }
  return null;
};

TieBreaker.prototype._progress = function (match) {
   // if id.r === 1, we need to move the player to r2 if it exists
  var last = this.matches[this.matches.length-1];
  if (match.id.r === 1 && last.id.r === 2) {
    var position = Math.ceil(this.limit / this.numGroups);
    var seedAry = updateSeedAry(this.posAry[match.id.m-1], match);
    // TODO: splice in seedAry into posAry at index match.id.m-1?
    last.p[match.id.m-1] = seedAry[position-1][0];
  }
};

// we only use tieCompute break up xplacers if there was R2 tiebreakers
// TODO: so only check for the TB condition (will break SOME tests)
var tieCompute = function (resAry, startPos, cb) {
  Base.resTieCompute(resAry, startPos, cb, function (r) {
    var val = "PTS" + r.pts;
    if (r.tb) {
      val += "TB" + r.tb;
    }
    return val;
  });
  //Base.resTieCompute(resAry, startPos, cb, $.get('tb'));
};

var compareResults = function (x, y) {
  if (x.pts !== y.pts) {
    return y.pts - x.pts;
  }
  if (x.tb != null && y.tb != null) {
    return y.tb - x.tb;
  }
  var xScore = x.for - (x.against || 0);
  var yScore = y.for - (y.against || 0);
  var scoreDiff = yScore - xScore;

  return scoreDiff || (x.seed - y.seed);
};

var finalCompare = function (x, y) {
  if (x.pos !== y.pos) {
    return x.pos - y.pos;
  }
  return compareResults(x, y);
};

var positionAcross = function (xarys) {
  // tieCompute across groups via xplacers to get the `pos` attribute
  var posctr = 0;
  xarys.forEach(function (xplacers) {
    xplacers.sort(compareResults);
    // same as the FFA/GroupStage except we can split up ties between
    // sections by construction (R2 breakers require this)
    // TODO: maybe shouldn't do it for pts?
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

  // inspect within section tiebreakers - and create xplacers arrays
  var xarys = $.replicate(this.groupSize, []);
  var findMatch = this.findMatch.bind(this);
  this.posAry.forEach(function (seedAry, i) {
    var m = findMatch({ s:0, r: 1, m: i+1 });
    if (m && m.m) {
      seedAry = updateSeedAry(seedAry, m);
    }
    // fill in xarys - either from what we had in posAry or break it up
    seedAry.forEach(function (gxp, x) {
      gxp.forEach(function (s) {
        var resEl = Base.resultEntry(res, s);
        // TODO: optionalize `gpos` key name, 'tbin' ?
        resEl.gpos = x+1;
        xarys[x].push(resEl);
      });
    });
  });

  // inspect between section tiebreaker
  var r2g = this.findMatch({ s:0, r: 2, m: 1 });
  // TODO: this SHOULD modify xarys[position-1]
  if (r2g && r2g.m) {
    r2g.p.forEach(function (p, i) {
      Base.resultEntry(res, p).tb = r2g.m[i];
    });
  }
  // TODO: doing this after r1 is bad - promoting too soon
  if (this.isDone()) {
    positionAcross(xarys);
  }

  return res.sort(finalCompare);
};

module.exports = TieBreaker;

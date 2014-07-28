var GroupStage = require('groupstage')
  , FFA = require('ffa')
  , TieBreaker = require(process.env.TIEBREAKER_COV ? '../tiebreaker-cov.js' : '../')
  , $ = require('interlude');

var makeStr = function (r) {
  return "P" + r.seed + " gpos=" + r.gpos + " pos=" + r.pos;
};

exports.groupedTiebreaker = function (t) {
  // start off with ffa because simpler to construct complicated ties
  var ffa = new FFA(8, { sizes: [4] });
  var fm = ffa.matches;
  // 2x three-way tie
  ffa.score(fm[0].id, [4,4,4,1]);
  ffa.score(fm[1].id, [4,3,3,3]);
  t.ok(ffa.isDone());
  t.deepEqual(ffa.rawPositions(ffa.results()), [
      [[1,3,6],[],[],[8]],
      [[2],[4,5,7],[],[]]
    ], 'ffa raw positions'
  );
  t.deepEqual(ffa.results().map(makeStr), [
      "P1 gpos=1 pos=1",
      "P2 gpos=1 pos=1",
      "P3 gpos=1 pos=1",
      "P6 gpos=1 pos=1",
      "P4 gpos=2 pos=5",
      "P5 gpos=2 pos=5",
      "P7 gpos=2 pos=5",
      "P8 gpos=4 pos=8"
    ],
    'tb results'
  );

  // need to break both clusters
  t.ok(TieBreaker.isNecessary(ffa, 4), "need to break this");
  var tb = TieBreaker.from(ffa, 4, { grouped: true });
  var tms = tb.matches;
  t.equal(tms.length, 2*3, "two groupstages per cluster");
  tms.forEach(function (m, i) {
    t.equal(m.id.s, i < 3 ? 1 : 2, "clusters follow sequentially");
    if (i < 3) {
      t.deepEqual(m.p, i === 0 ? [3,6] : i === 1 ? [1,6] : [1, 3], 's1 pls');
    }
    else {
      t.deepEqual(m.p, i === 3 ? [5,7] : i === 4 ? [4,7] : [4,5], 's2 pls');
    }
  });
  tms.forEach(function (m) {
    // tie everything in group 1, highest seeds win in group 2
    var scrs = m.id.s === 1 ? [1, 1] : (m.p[0] < m.p[1] ? [1,0] : [0, 1]);
    t.ok(tb.score(m.id, scrs), "can score " + tb.rep(m.id));
  });

  t.ok(tb.isDone(), 'tb done');
  t.deepEqual(tb.rawPositions(), [
      [[1,3,6],[],[],[8]],
      [[2],[4],[5],[7]]
    ], 'tb raw positions'
  );
  t.deepEqual(tb.results().map(makeStr), [
      "P1 gpos=1 pos=1",
      "P2 gpos=1 pos=1",
      "P3 gpos=1 pos=1",
      "P6 gpos=1 pos=1",
      "P4 gpos=2 pos=5",
      "P5 gpos=3 pos=6",
      "P7 gpos=4 pos=7",
      "P8 gpos=4 pos=7"
    ],
    'tb results'
  );

  // forward first tiebreaker results to another tiebreaker
  t.ok(TieBreaker.isNecessary(tb, 4), "need to break this again");
  var tb2 = TieBreaker.from(tb, 4, { grouped: true });
  var tms2 = tb2.matches;
  t.equal(tms2.length, 3, "one cluster unbroken");
  tms2.forEach(function (m, i) {
    t.deepEqual(m.p, i === 0 ? [3,6] : i === 1 ? [1,6] : [1, 3], 's1 pls');
    // unbreak 3 and 6 only
    var scrs = (i === 2) ? [1,1] : (m.p[0] < m.p[1] ? [1,0] : [0,1]);
    t.ok(tb2.score(m.id, scrs), "can score " + tb.rep(m.id));
  });

  t.ok(tb2.isDone(), 'tb2 done');
  t.deepEqual(tb2.rawPositions(), [
      [[1,3],[],[6],[8]], // partially unbroken this group
      [[2],[4],[5],[7]]
    ], 'tb2 raw positions'
  );
  t.deepEqual(tb2.results().map(makeStr), [
      "P1 gpos=1 pos=1",
      "P2 gpos=1 pos=1",
      "P3 gpos=1 pos=1",
      "P4 gpos=2 pos=4",
      "P6 gpos=3 pos=5",
      "P5 gpos=3 pos=5",
      "P7 gpos=4 pos=7",
      "P8 gpos=4 pos=7"
    ],
    'tb results'
  );

  t.ok(!TieBreaker.isNecessary(tb2, 4), "no need to break any more");
  var tb3 = TieBreaker.from(tb2, 4, { grouped: true });
  t.deepEqual(tb3.matches, [], 'because nothing to break');

  t.done();
};

exports.readme = function (t) {
  var gs = new GroupStage(8, { groupSize: 4 });
  gs.matches.forEach(function (m, i) {
    if (m.id.s === 1) {
      gs.score(m.id, i === 2 ? [1,0] : [1, 1]);
    }
    if (m.id.s === 2) {
      gs.score(m.id, ([4].indexOf(m.id.r) >= 0) ? [1, 0] : [0, 1]);
    }
  });

  t.deepEqual(gs.rawPositions(gs.results()), [
      [[1],[3,8],[],[6]],
      [[4,5,7],[],[],[2]]
    ], 'gs positions'
  );
  t.ok(TieBreaker.isNecessary(gs, 4), "need to break this up");

  // ffa breakers:
  (function () {
    var tb = TieBreaker.from(gs, 4); // want the top 4
    t.deepEqual(tb.matches, [
        { id: { s: 1, r: 1, m: 1 }, p: [ 3, 8 ] },
        { id: { s: 2, r: 1, m: 1 }, p: [ 4, 5, 7 ] }
      ], 'ffa breakers'
    );
    tb.score(tb.matches[0].id, [2,1]);
    tb.score(tb.matches[1].id, [3,2,1]);
    var top4 = tb.results().slice(0, 4);
    t.deepEqual(top4.map($.get('seed')), [4,1,5,3]); // order because score diff
    t.deepEqual(top4.map($.get('pos')), [1,1,3,3]); // which does not break between
  }());

  // grouped breakers:
  (function () {
    var tb = TieBreaker.from(gs, 4, { grouped: true });
    t.equal(tb.matches.length, 3*1+1, "one 3 person groupstage and a 2player gs");
    t.deepEqual(tb.matches, [
        { id: { s: 1, r: 1, m: 1 }, p: [ 3, 8 ] },
        { id: { s: 2, r: 1, m: 1 }, p: [ 5, 7 ] },
        { id: { s: 2, r: 2, m: 1 }, p: [ 4, 7 ] },
        { id: { s: 2, r: 3, m: 1 }, p: [ 4, 5 ] }
      ], "grouped breakers"
    );
    tb.matches.forEach(function (m) {
      tb.score(m.id, m.p[0] < m.p[1] ? [1,0] : [0,1]);
    });
    var top4 = tb.results().slice(0, 4);
    t.deepEqual(top4.map($.get('seed')), [4,1,5,3]); // order because score diff
    t.deepEqual(top4.map($.get('pos')), [1,1,3,3]); // which does not break between
  }());

  t.done();
};

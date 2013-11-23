var test = require('tap').test;
var TieBreaker = require('../');
var FFA = require('ffa');

test("grouped tiebreaker resolution", function (t) {
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

  // need to break both clusters
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

  // forward first tiebreaker results to another tiebreaker
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

  t.end();
});

var test = require('tap').test
  , $ = require('interlude')
  , FFA = require('ffa')
  , TieBreaker = require('../');

var makeStr = function(r) {
  var str = r.pos + " P" + r.seed + " W=" + r.wins;
  str += " F=" + r.for + " A=" + r.against;
  if (r.gpos) {
    str += " GPOS=" + r.gpos;
  }
  return str;
};


test("ffa 8 [4] limit 4", function (t) {
  var ffa = new FFA(8, { sizes: [4] });
  var fm = ffa.matches;
  t.equal(fm.length, 2, "two matches in ffa");
  t.deepEqual(fm[0].p, [1,3,6,8], 'players in match 1');
  t.equal(ffa.score(fm[0].id, [4,4,2,1]), true, "score match 1");
  t.deepEqual(fm[1].p, [2,4,5,7], 'players in match 2');
  t.equal(ffa.score(fm[1].id, [3,2,2,1]), true, "score match 2");
  t.ok(ffa.isDone(), 'ffa done now');

  t.deepEqual(ffa.rawPositions(ffa.results()), [
      [[1,3],[],[6],[8]],
      [[2],[4,5],[],[7]]
    ], 'ffa posAry before tiebreaking'
  );

  var tb = TieBreaker.from(ffa, 1);
  var tbms = tb.matches;
  t.equal(tbms.length, 2, "matches in tb");
  t.equal(tbms[0].id.r, 1, "first is a round one match");
  t.deepEqual(tbms[0].p, [1, 3], "containing tied in match 1");
  t.equal(tbms[0].id.m, 1, "thus it is the section one within breaker");
  t.equal(tbms[1].id.r, 2, 'second match is the between breaker');
  t.deepEqual(tbms[1].p, [0, 2], 'which waits for winner of tbms[0]');
  tb.score(tbms[0].id, [2,1]);
  t.deepEqual(tbms[1].p, [1, 2], 'no longer waiting');
  tb.score(tbms[1].id, [2,1]);
  t.ok(tb.isDone(), 'tb done');

  var tbRes = tb.results();
  // TODO: this is WRONG - need to reposition
  t.deepEqual(tbRes.map(makeStr), [
      // the between fighters
      "1 P1 W=1 F=4 A=0 GPOS=1",
      "2 P2 W=1 F=3 A=0 GPOS=1",
      // the newly determined second placer (3 no longer tied for 1)
      "3 P3 W=1 F=4 A=0 GPOS=2",
      // the original 2nd placers
      "3 P4 W=0 F=2 A=1 GPOS=2",
      "3 P5 W=0 F=2 A=1 GPOS=2",
      // original 3rd placer
      "6 P6 W=0 F=2 A=2 GPOS=3",
      // original 4th placers
      "7 P7 W=0 F=1 A=2 GPOS=4",
      "7 P8 W=0 F=1 A=3 GPOS=4",
    ], 'tb res'
  );

  t.deepEqual(ffa.rawPositions(tbRes), [
      [[1],[3],[6],[8]],
      [[2],[4,5],[],[7]]
    ], 'ffa posAry after tiebreaking'
  );

  t.end();
});

test("ffa unbalanced continuation", function (t) {
  var ffa = new FFA(15, { sizes: [4, 4], advancers: [2] });
  var fm = ffa.matches;
  t.deepEqual(fm[0].p, [1, 5, 12], 'R1M1.p');
  // can tie outside adv
  ffa.score(fm[0].id, [4,4,2]);
  ffa.score(fm[1].id, [3,3,2,2]);
  ffa.score(fm[2].id, [3,3,2,2]);
  ffa.score(fm[3].id, [3,3,2,1]);
  ffa.score(fm[4].id, [4,4,4,1]); // final 1
  ffa.score(fm[5].id, [4,3,3,3]); // final 2

  t.deepEqual(ffa.rawPositions(ffa.results()), [
      [ [1, 2, 6], [], [], [8] ],
      [ [5], [3, 4, 7], [], [] ]
    ], 'posAry for ffa - 2x three way tie in final'
  );

  // verify basic tiebreakability while we are at it
  // dont really know top 4 from these results
  // HOWEVER - if we did .from(ffa, 4) on other tournament
  // we would unfortunately just pick [1,5,2,6] (WHICH IS UNFAIR)
  var tb = TieBreaker.from(ffa, 4);
  var tbm = tb.matches;
  t.deepEqual(tbm[0].p, [1,2,6], 'r1 tiebreaker 1');
  t.deepEqual(tbm[1].p, [3,4,7], 'r1 tiebreaker 2');
  tb.score(tbm[0].id, [3,2,1]);
  tb.score(tbm[1].id, [3,2,1]);
  t.ok(tb.isDone(), 'tb done now');

  var tbRes = tb.results();
  t.deepEqual(ffa.rawPositions(tbRes), [
      [[1],[2],[6],[8]],
      [[5],[3],[4],[7]]
    ], 'posAry after tb - all broken'
  );

  var top4 = $.pluck('seed', tbRes.slice(0, 4));
  t.deepEqual(top4, [1, 5, 2, 3], 'broken top 4 picks 2 from each m');

  t.end();
});

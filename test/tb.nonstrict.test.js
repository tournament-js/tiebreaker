var FFA = require('ffa')
  , TieBreaker = require(process.env.TIEBREAKER_COV ? '../tiebreaker-cov.js' : '../');

exports.unbalancedFfa = function (t) {
  var ffa = new FFA(16, { sizes: [4, 4], advancers: [2] });
  var fm = ffa.matches;
  // top seeds to final
  ffa.score(fm[0].id, [4,3,2,1]);
  ffa.score(fm[1].id, [4,3,2,1]);
  ffa.score(fm[2].id, [4,3,2,1]);
  ffa.score(fm[3].id, [4,3,2,1]);
  // 2x three way tie them in final
  ffa.score(fm[4].id, [4,4,4,1]);
  ffa.score(fm[5].id, [4,3,3,3]);

  t.deepEqual(ffa.rawPositions(ffa.results()), [
      [ [1, 3, 6], [], [], [8] ],
      [ [2], [4, 5, 7], [], [] ]
    ], 'posAry for ffa - 2x three way tie in final'
  );

  // want to gradually (over the course of several tiebreakers) break up posAry
  // first a noop TB (all just tie again)
  var tb = TieBreaker.from(ffa, 4);
  var tbm = tb.matches;
  t.equal(tbm.length, 2, 'two matches in tbm');
  t.deepEqual(tbm[0].p, [1,3,6], 's1 tiebreaker 1');
  t.deepEqual(tbm[1].p, [4,5,7], 's1 tiebreaker 2');
  t.ok(tb.score(tbm[0].id, [1,1,1]), 'can fully tie s1m1');
  t.ok(tb.score(tbm[1].id, [2,2,2]), 'can fully tie s1m2');
  t.ok(tb.isDone(), 'tb done now');

  t.deepEqual(tb.rawPositions(), [
      [ [1, 3, 6], [], [], [8] ],
      [ [2], [4, 5, 7], [], [] ]
    ], 'posAry after tb1 - no changes'
  );

  // then partialy break r1m2
  var tb2 = TieBreaker.from(tb, 4);
  var tb2m = tb2.matches;
  t.equal(tb2m.length, 2, 'two matches in tb2m');
  t.deepEqual(tb2m[0].p, [1,3,6], 'r1 tiebreaker 1');
  t.deepEqual(tb2m[1].p, [4,5,7], 'r1 tiebreaker 2');
  t.ok(tb2.score(tb2m[0].id, [1,1,1]), 'can still fully tie s1m1');
  t.ok(tb2.score(tb2m[1].id, [2,2,1]), 'can untie s1m2 partially');
  t.ok(tb2.isDone(), 'tb2 done now');

  t.deepEqual(tb2.rawPositions(), [
      [ [1, 3, 6], [], [], [8] ],
      [ [2], [4, 5], [], [7] ]
    ], 'posAry after tb2 - partially broken cluster 1'
  );

  // then break remaining r1m2
  var tb3 = TieBreaker.from(tb2, 4);
  var tb3m = tb3.matches;
  t.equal(tb3m.length, 2, 'two matches in tb3m');
  t.deepEqual(tb3m[0].p, [1,3,6], 's1 tiebreaker 1');
  t.deepEqual(tb3m[1].p, [4,5], 's1 tiebreaker 2 smaller now');
  t.ok(tb3.score(tb3m[0].id, [1,1,1]), 'can still fully tie s1m1');
  t.ok(tb3.score(tb3m[1].id, [2,1]), 'can untie s1m2 fully');
  t.ok(tb3.isDone(), 'tb3 done now');

  t.deepEqual(tb3.rawPositions(), [
      [ [1, 3, 6], [], [], [8] ],
      [ [2], [4], [5], [7] ]
    ], 'posAry after tb3 - fully broken cluster 1'
  );

  var tb4 = TieBreaker.from(tb3, 4);
  var tb4m = tb4.matches;
  t.equal(tb4m.length, 1, 'only 1 match in tb4m');
  t.deepEqual(tb4m[0].p, [1,3,6], 's1 tiebreaker 1');
  t.ok(tb4.score(tb4m[0].id, [1,1,0]), 'can sufficiently untie s1');
  t.ok(tb4.isDone(), 'tb4 done now');

  t.deepEqual(tb4.rawPositions(), [
      [ [1, 3], [], [6], [8] ],
      [ [2], [4], [5], [7] ]
    ], 'posAry after tb4 - fully broken cluster 1'
  );

  t.done();
};

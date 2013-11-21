var tap = require('tap')
  , test = tap.test
  , GroupStage = require('groupstage')
  , TieBreaker = require('../');

test("tiebreaker 6 3 uefa unanimous scoring", function (t) {
  // same as tb uefa test
  var uefa = new GroupStage(6, {
    groupSize: 3,
    meetTwice: true,
    scoresBreak: true
  });
  uefa.matches.forEach(function (m) {
    t.ok(uefa.score(m.id, m.p[0] < m.p[1] ? [2,1] : [1, 2]), "score match");
  });

  var posAry = uefa.rawPositions(uefa.results());
  t.deepEqual(posAry, [
      [[1],[3],[6]],
      [[2],[4],[5]]
    ], 'untied posAry'
  );

  [1,2,3,4,5,6].forEach(function (n) {
    if (n === 2 || n === 4) {
      // allowed but no ties
      var tb = TieBreaker.from(uefa, n);
      t.equal(tb.matches.length, 0, "no matches required");
    }
    else {
      try {
        TieBreaker.from(uefa, n);
        t.ok(false, "should not be able to create " + n + "p TB from 2 groups");
      }
      catch (e) {
        var r = "Cannot construct TieBreaker: "
        r += (n < 6) ?
          "number of sections must divide limit" :
          "limit must be an integer in {1, ..., previous.numPlayers}";
        t.equal(e.message, r, "Invalid TieBreaker reason");
      }
    }
  });
  t.end();
});

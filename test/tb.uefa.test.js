var GroupStage = require('groupstage')
  , FFA = require('ffa')
  , $ = require('interlude')
  , TieBreaker = require('..')
  , test = require('bandage');

test('uefa', function *(t) {
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
  t.eq(posAry, [
      [[1],[3],[6]],
      [[2],[4],[5]]
    ], 'untied posAry'
  );

  [1,2,3,4,5,6].forEach(function (n) {
    if (n === 2 || n === 4) {
      // allowed but no ties
      var tb = TieBreaker.from(uefa, n);
      t.eq(tb.matches.length, 0, "no matches required");
    }
    else {
      try {
        TieBreaker.from(uefa, n);
        t.ok(false, "should not be able to create " + n + "p TB from 2 groups");
      }
      catch (e) {
        var r = "Cannot construct TieBreaker: ";
        r += (n < 6) ?
          "number of sections must divide limit" :
          "limit must be an integer in {1, ..., previous.numPlayers}";
        t.eq(e.message, r, "Invalid TieBreaker reason");
      }
    }
  });
});

test('rescoring', function *(t) {
  // make sure we can always recore a tiebreaker until we have committed the 'stage'
  // which is tourney terminology
  var ffa = new FFA(8, { sizes: [4] });
  ffa.score(ffa.matches[0].id, [1,1,1,1]);
  ffa.score(ffa.matches[1].id, [1,1,1,1]);
  t.eq(ffa.rawPositions(ffa.results()), [
      [ [1,3,6,8],[],[],[] ],
      [ [2,4,5,7],[],[],[] ]
    ]
    , "fully tied 4x2 ffa"
  );
  var tb = TieBreaker.from(ffa, 4);
  t.eq(tb.matches.length, 2, "one tb for each 'group'");
  tb.score(tb.matches[0].id, [4,3,2,1]);
  tb.score(tb.matches[1].id, [4,3,2,1]);
  t.ok(tb.isDone(), 'decided on winners of tb now');
  t.eq($.pluck('seed', tb.results().slice(0, 2)), [1,2], "winners top seeds");

  t.eq(tb.unscorable(tb.matches[0].id, [1,2,3,4]), null, "can rescore G1 still");
  t.eq(tb.unscorable(tb.matches[1].id, [1,2,3,4]), null, "can rescore G2 still");

  tb.score(tb.matches[0].id, [1,2,3,4]);
  tb.score(tb.matches[1].id, [1,2,3,4]);
  t.ok(tb.isDone(), 'tb still done');
  t.eq($.pluck('seed', tb.results().slice(0, 2)), [7,8], "winners bottom seeds");
});

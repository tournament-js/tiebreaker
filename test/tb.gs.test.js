var $ = require('interlude')
  , GroupStage = require('groupstage')
  , TieBreaker = require('..')
  , nullLog = require('smell')()
  , test = require('bandage');

test('fullTiedNineThreePickWinner', function *(t) {
  var gs = new GroupStage(9, { groupSize: 3 });
  var ms = gs.matches;

  // score so that everyone got exactly one win
  // easy to do by symmetry in this case, reverse score middle match in group
  ms.forEach(function (m) {
    gs.score(m.id, (m.id.r === 2) ? [0, 1] : [1, 0]);
  });

  var res = gs.results();
  t.eq($.nub($.pluck('wins', res)), [1], 'all players won 1 match');

  // want to proceed the winner of each group
  var tb = TieBreaker.from(gs, 3, { strict: true, log: nullLog });
  var tms = tb.matches;

  t.eq(tms.length, 3, 'should only need within TBs');

  t.eq(tms[0].p, gs.players({ s: 1 }), 'r1 tiebreaker contains group 1 players');
  t.eq(tms[1].p, gs.players({ s: 2 }), 'r1 tiebreaker contains group 2 players');
  t.eq(tms[2].p, gs.players({ s: 3 }), 'r1 tiebreaker contains group 3 players');

  var isAllR1 = tms.map($.get('id', 'r')).every($.eq(1));
  t.ok(isAllR1, 'should only have R1 tiebreakers (within groups)');

  tms.forEach(function (m, i) {
    t.ok(!tb.score(m.id, [2,2,2]), 'cant tie-score tb ' + i);
    t.ok(!tb.score(m.id, [1,2,2]), 'cant tie-score tb ' + i);
    t.ok(!tb.score(m.id, [1,2,1]), 'cant tie-score tb ' + i);
    t.ok(!tb.score(m.id, [2,1,2]), 'cant tie-score tb ' + i);
    t.eq(m.p.length, 3, '3 players in tb ' + i);
    t.eq(tb.unscorable(m.id, [3,2,1]), null, 'but this should work');
    t.ok(tb.score(m.id, [3,2,1]), 'and it does');
  });
});

test('betweenTiedNineThreePickAny', function *(t) {
  var gs = new GroupStage(9, { groupSize: 3 });
  var ms = gs.matches;

  // score so that everyone according to seed - ensures no ties within groups
  // but because all groups are identical, we cant pick from one group over another
  ms.forEach(function (m) {
    gs.score(m.id, (m.p[0] < m.p[1]) ? [1, 0] : [0, 1]);
  });

  var res = gs.results();
  var wins = $.nub($.pluck('wins', res)).sort($.compare(+1));
  t.eq(wins, [0, 1, 2], 'full spectrum of wins');

  [3, 6].forEach(function (n) {
    var tb = TieBreaker.from(gs, n);
    var tms = tb.matches;
    tms.forEach(function (m) {
      t.ok(m.id.s <= 4, 'all tb matches occur in s <= 4');
    });
    t.eq(tms.length, 0, 'no TBs when picking eqly from each group');
  });
});

// TODO: this is a GroupStage test?... should not be in here..
test('mapsBreak', function *(t) {
  [false, true].forEach(function (mapsBreak) {
    var gs = new GroupStage(6, { groupSize: 3, scoresBreak: mapsBreak});
    var ms = gs.matches;

    t.eq(gs.scoresBreak, mapsBreak, 'set break correctly');
    // want to score s.t. both groups have clear 1st, 2nd and 3rd (with mapsBreak)
    // but need breaking between

    // score according to seeds - with magnitude according to group number
    // this ensure no ties within the groups and no ties between groups
    // by reversing only one of the matches this is assured (and weighting by round)
    // weight map scores by groups as well
    ms.forEach(function (m) {
      var a = m.id.r + m.id.s;
      gs.score(m.id, (m.id.r === m.id.s) ? [0, a] : [a, 0]);
    });

    // just to verify the grand scheme:
    // grp1 should have pts 6 3 0 mapsFor 7 2 0 mapsAgainst 0 3 6
    // grp2 should have pts 3 3 3 mapsFor 5 4 3 mapsAgainst 4 5 3
    var makeStr = function (r) {
      var str = r.pos + ' P' + r.seed + ' WDL=' + r.wins + ',' + r.draws + ',' + r.losses;
      str += ' F=' + r.for + ' A=' + r.against;
      str += ' => GPOS=' + r.gpos + ' in grp ' + r.grp;
      return str;
    };
    if (!mapsBreak) {
      t.eq(gs.results().map(makeStr), [
        '1 P1 WDL=2,0,0 F=7 A=0 => GPOS=1 in grp 1',
        '1 P2 WDL=1,0,1 F=5 A=4 => GPOS=1 in grp 2',
        '1 P5 WDL=1,0,1 F=4 A=3 => GPOS=1 in grp 2',
        '1 P4 WDL=1,0,1 F=3 A=5 => GPOS=1 in grp 2',
        '5 P6 WDL=1,0,1 F=2 A=3 => GPOS=2 in grp 1',
        '6 P3 WDL=0,0,2 F=0 A=6 => GPOS=3 in grp 1'
      ],
        'no break results'
      );
    }
    else {
      t.eq(gs.results().map(makeStr), [
        '1 P1 WDL=2,0,0 F=7 A=0 => GPOS=1 in grp 1',
        '1 P2 WDL=1,0,1 F=5 A=4 => GPOS=1 in grp 2', // P2 ties P5 because
        '1 P5 WDL=1,0,1 F=4 A=3 => GPOS=1 in grp 2', // same score diff
        '4 P6 WDL=1,0,1 F=2 A=3 => GPOS=2 in grp 1',
        '5 P4 WDL=1,0,1 F=3 A=5 => GPOS=3 in grp 2',
        '5 P3 WDL=0,0,2 F=0 A=6 => GPOS=3 in grp 1'
      ],
        'map break results'
      );
    }

    [2, 4].forEach(function (n) {
      if (!mapsBreak) {
        var tb = TieBreaker.from(gs, n);
        var tms = tb.matches;
        t.eq(tms.length, 1, 'should be one within tiebreaker for ' + n);
        t.ok(tms[0].id.s <= 2, 'it should be a within match then');
        t.eq(tms[0].p, [2, 4, 5], 'entire group 2 must be broken');
      }
    });
  });
});

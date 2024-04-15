import {parseScorecardById} from '..';

test('asdf', () => {
    it('returns', () => {
        const result = parseScorecardById('123');
        expect(result).toBe('https://udisc.com/scorecards/123');
    });
});
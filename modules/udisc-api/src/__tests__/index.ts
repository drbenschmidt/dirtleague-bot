import { generateUrlById } from '../index';

describe('generateUrlById', () => {
    it('returns udisc URL', () => {
        const result = generateUrlById('123');
        expect(result).toBe('https://udisc.com/scorecards/123');
    });
});
import { toConstantCase } from '../utils/toConstantCase';

describe('toConstantCase', () => {
    it('should convert a single word to constant case', () => {
        const input = 'hello';
        const expected = 'HELLO';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });

    it('should convert a sentence to constant case', () => {
        const input = 'hello world';
        const expected = 'HELLO_WORLD';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });

    it('should convert a camelCase string to constant case', () => {
        const input = 'helloWorld';
        const expected = 'HELLO_WORLD';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });

    it('should convert a kebab-case string to constant case', () => {
        const input = 'hello-world';
        const expected = 'HELLO_WORLD';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });

    it('should convert a snake_case string to constant case', () => {
        const input = 'hello_world';
        const expected = 'HELLO_WORLD';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });

    it('should convert a mixed case string to constant case', () => {
        const input = 'helloWorld-foo_bar';
        const expected = 'HELLO_WORLD_FOO_BAR';
        const result = toConstantCase(input);
        expect(result).toEqual(expected);
    });
});

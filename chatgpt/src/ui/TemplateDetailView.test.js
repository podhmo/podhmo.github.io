import { extractPlaceholders, processPromptBodyForTesting } from './TemplateDetailView.js';

describe('extractPlaceholders', () => {
    it('should return an empty array for a string with no placeholders', () => {
        expect(extractPlaceholders("Hello world!")).toEqual([]);
    });

    it('should extract a simple placeholder', () => {
        expect(extractPlaceholders("Hello {{name}}!")).toEqual([{ name: "name", defaultValue: null }]);
    });

    it('should extract a placeholder with a default value', () => {
        expect(extractPlaceholders("Hello {{name:Guest}}!")).toEqual([{ name: "name", defaultValue: "Guest" }]);
    });

    it('should extract a placeholder with an empty default value', () => {
        expect(extractPlaceholders("Hello {{name:}}!")).toEqual([{ name: "name", defaultValue: "" }]);
    });

    it('should extract multiple mixed placeholders', () => {
        const result = extractPlaceholders("Hello {{name:Guest}}, welcome to {{place}}!");
        expect(result).toEqual(expect.arrayContaining([
            { name: "name", defaultValue: "Guest" },
            { name: "place", defaultValue: null }
        ]));
        expect(result.length).toBe(2);
    });

    it('should extract placeholders with spaces in name and default value', () => {
        // The regex trim()s the parts, so spaces inside are preserved but leading/trailing for each part are removed
        expect(extractPlaceholders("{{ full name : John Doe }}")).toEqual([{ name: "full name", defaultValue: "John Doe" }]);
    });

    it('should extract placeholders with leading/trailing spaces around name and default', () => {
        expect(extractPlaceholders("{{name : Guest }}")).toEqual([{ name: "name", defaultValue: "Guest" }]);
    });

    it('should extract a placeholder with colons in the default value', () => {
        expect(extractPlaceholders("{{variable:default:with:colons}}")).toEqual([{ name: "variable", defaultValue: "default:with:colons" }]);
    });

    it('should return unique placeholders, preferring the first encountered', () => {
        expect(extractPlaceholders("{{name}} {{name:default}} {{name}}")).toEqual([{ name: "name", defaultValue: null }]);
    });

    it('should return unique placeholders, preferring the first encountered (default first)', () => {
        expect(extractPlaceholders("{{name:default}} {{name}} {{name:another}}")).toEqual([{ name: "name", defaultValue: "default" }]);
    });
});

describe('processPromptBodyForTesting', () => {
    it('Scenario 1: Simple placeholder, no user input, no default', () => {
        const prompt = "Hello {{name}}!";
        const uniquePlaceholders = [{ name: "name", defaultValue: null }];
        const placeholderValues = { name: "" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello {{name}}!");
    });

    it('Scenario 2: Placeholder with default, no user input (value initialized with default)', () => {
        const prompt = "Hello {{name:Guest}}!";
        const uniquePlaceholders = [{ name: "name", defaultValue: "Guest" }];
        // placeholderValues would be initialized to { name: "Guest" } by the component.
        // If user clears it, it becomes "", then default is reapplied.
        const placeholderValues = { name: "" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello Guest!");
    });

    it('Scenario 2b: Placeholder with default, placeholder value is the default value itself', () => {
        const prompt = "Hello {{name:Guest}}!";
        const uniquePlaceholders = [{ name: "name", defaultValue: "Guest" }];
        const placeholderValues = { name: "Guest" }; // Initial state
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello Guest!");
    });


    it('Scenario 3: Placeholder with default, user provides input', () => {
        const prompt = "Hello {{name:Guest}}!";
        const uniquePlaceholders = [{ name: "name", defaultValue: "Guest" }];
        const placeholderValues = { name: "Alice" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello Alice!");
    });

    it('Scenario 4: Placeholder without default, user provides input', () => {
        const prompt = "Hello {{name}}!";
        const uniquePlaceholders = [{ name: "name", defaultValue: null }];
        const placeholderValues = { name: "Bob" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello Bob!");
    });

    it('Scenario 5: Multiple placeholders, mixed', () => {
        const prompt = "Welcome {{name:User}} to {{city:New York}}. Age: {{age}}";
        const uniquePlaceholders = [
            { name: "name", defaultValue: "User" },
            { name: "city", defaultValue: "New York" },
            { name: "age", defaultValue: null }
        ];
        // User cleared name (so default "User" should apply), changed city to "London", left age empty (so {{age}} should remain)
        const placeholderValues = { name: "", city: "London", age: "" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Welcome User to London. Age: {{age}}");
    });

    it('Scenario 6: Placeholder with an empty string as default, user provides no input', () => {
        const prompt = "Value: {{val:}}";
        const uniquePlaceholders = [{ name: "val", defaultValue: "" }];
        // placeholderValues would be initialized to { val: "" }
        const placeholderValues = { val: "" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Value: ");
    });

    it('Scenario 7: Placeholder with an empty string as default, user provides input', () => {
        const prompt = "Value: {{val:}}";
        const uniquePlaceholders = [{ name: "val", defaultValue: "" }];
        const placeholderValues = { val: "test" };
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Value: test");
    });

    it('Scenario 8: Placeholder not in uniquePlaceholders (should not happen in practice but tests robustness)', () => {
        const prompt = "Hello {{name}} and {{extra}}";
        const uniquePlaceholders = [{ name: "name", defaultValue: null }]; // 'extra' is not in uniquePlaceholders
        const placeholderValues = { name: "Test", extra: "Val" };
        // '{{extra}}' should remain unchanged as it's not processed via uniquePlaceholders
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Hello Test and {{extra}}");
    });

    it('Scenario 9: Placeholder value is undefined (should use default or {{name}})', () => {
        const prompt = "Test: {{var1:default}} and {{var2}}";
        const uniquePlaceholders = [
            { name: "var1", defaultValue: "default" },
            { name: "var2", defaultValue: null }
        ];
        const placeholderValues = { }; // var1 and var2 are undefined
        // This test the `valueToReplace === undefined` block
        expect(processPromptBodyForTesting(prompt, uniquePlaceholders, placeholderValues)).toBe("Test: default and {{var2}}");
    });
});

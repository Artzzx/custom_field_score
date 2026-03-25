import { extractFieldValue } from '../jira-service';

describe('extractFieldValue', () => {
  it('returns empty string for null', () => {
    expect(extractFieldValue(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(extractFieldValue(undefined)).toBe('');
  });

  it('returns string as-is', () => {
    expect(extractFieldValue('High')).toBe('High');
  });

  it('converts number to string', () => {
    expect(extractFieldValue(5)).toBe('5');
    expect(extractFieldValue(0)).toBe('0');
    expect(extractFieldValue(3.14)).toBe('3.14');
  });

  it('converts boolean to string', () => {
    expect(extractFieldValue(true)).toBe('true');
    expect(extractFieldValue(false)).toBe('false');
  });

  it('extracts name from priority-like objects', () => {
    expect(extractFieldValue({ name: 'High', id: '2' })).toBe('High');
  });

  it('extracts value from custom select-like objects', () => {
    expect(extractFieldValue({ value: 'Option A', id: '10' })).toBe('Option A');
  });

  it('returns JSON for unknown objects', () => {
    const obj = { foo: 'bar' };
    expect(extractFieldValue(obj)).toBe(JSON.stringify(obj));
  });

  it('extracts name from first array element', () => {
    expect(extractFieldValue([{ name: 'Sprint 1', id: '1' }])).toBe('Sprint 1');
  });

  it('extracts value from first array element with value prop', () => {
    expect(extractFieldValue([{ value: 'Option 1', id: '1' }])).toBe('Option 1');
  });

  it('returns empty string for empty array', () => {
    expect(extractFieldValue([])).toBe('');
  });

  it('converts first array element to string when no name/value', () => {
    expect(extractFieldValue([42])).toBe('42');
  });
});

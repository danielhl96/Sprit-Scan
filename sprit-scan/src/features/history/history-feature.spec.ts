import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HistoryFeature } from './history-feature';

describe('HistoryFeature (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let feature: HistoryFeature;
  let mockHistoryEntries: any[];
  beforeEach(() => {
    feature = TestBed.runInInjectionContext(() => new HistoryFeature());
    mockHistoryEntries = [
      { id: 1, name: 'Test Entry 1', date: new Date(), result: 'Result 1' },
      { id: 2, name: 'Test Entry 2', date: new Date(), result: 'Result 2' },
      { id: 3, name: 'Another Test Entry', date: new Date(), result: 'Result 3' },
    ];
    jest.spyOn(feature['scanStore'], 'entries').mockReturnValue(mockHistoryEntries);
  });

  it('should set input search value', () => {
    const testValue = 'test';
    feature.inputSearchValue(testValue);
    expect(feature.inputSearch()).toBe(testValue);
  });

  it('should find the searched entry', () => {
    feature.inputSearchValue('Test Entry');
    const filteredEntries = feature.HistoryEntry();
    expect(filteredEntries.length).toBe(3);
    expect(filteredEntries[0].name).toBe('Test Entry 1');
    expect(filteredEntries[1].name).toBe('Test Entry 2');
    expect(filteredEntries[2].name).toBe('Another Test Entry');
  });
  it('should not find any entries if search does not match', () => {
    feature.inputSearchValue('Nonexistent Entry');
    const filteredEntries = feature.HistoryEntry();
    expect(filteredEntries.length).toBe(0);
  });
  it('should delete an entry', () => {
    const deleteSpy = jest.spyOn(feature['scanStore'], 'deleteEntry');
    feature.deleteEntry(1);
    expect(deleteSpy).toHaveBeenCalledWith(1);
    jest
      .spyOn(feature['scanStore'], 'entries')
      .mockReturnValue(mockHistoryEntries.filter((entry) => entry.id !== 1));
    feature.HistoryEntry(); // Trigger the computed property to update
    expect(feature.HistoryEntry().length).toBe(2); // The computed property still returns the mocked entries
  });
});

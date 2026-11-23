import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('ScanFeature (Unit)', () => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  let feature: any;
  beforeEach(() => {
    feature = TestBed.runInInjectionContext(() => new (require('./scan-feature').ScanFeature)());
  });

  it('should handle file selected', async () => {
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const mockCompressed = new File(['small'], 'compressed.png', { type: 'image/png' });
    jest.spyOn(feature, 'compressImage').mockResolvedValue(mockCompressed);
    jest.spyOn(feature, 'readFileAsDataUrl').mockResolvedValue('data:image/png;base64,dummydata');
    jest.spyOn(feature, 'scanFile').mockImplementation(() => {});

    await feature.handleFileSelected(mockFile);

    expect(feature.compressImage).toHaveBeenCalledWith(mockFile);
    expect(feature.readFileAsDataUrl).toHaveBeenCalledWith(mockCompressed);
    expect(feature.scanFile).toHaveBeenCalledWith('data:image/png;base64,dummydata');
  });

  it('should handle compress image error', async () => {
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    jest.spyOn(feature, 'compressImage').mockRejectedValue(new Error('Compression error'));
    const notificationSpy = jest.spyOn(feature['notificationService'], 'showNotification');

    await expect(feature.handleFileSelected(mockFile)).resolves.toBeUndefined();
    expect(notificationSpy).toHaveBeenCalledWith(
      'Error processing image. Please try again.',
      'error',
    );
  });
  it('should return the response from the AI service', async () => {
    const mockAnswer = {
      id: 1,
      name: 'Test Entry',
      date: new Date(),
      description: 'Test Description',
      taste: 'Test Taste',
      origin: 'Test Origin',
      recommendation: 'Test Recommendation',
      year: '2024',
      customerReview: 'Test Custom Review',
      rawMaterials: 'Test Raw Materials',
      alternative: 'Test Alternative',
      price: '10.50',
    };

    expect(feature.mapResponseToEntry(mockAnswer)).toEqual({
      id: expect.any(Number),
      date: expect.any(String),
      name: 'Test Entry',
      description: 'Test Description',
      taste: 'Test Taste',
      origin: 'Test Origin',
      recommendation: 'Test Recommendation',
      year: '2024',
      customerreview: 'Test Custom Review',
      rawmaterials: 'Test Raw Materials',
      alternative: 'Test Alternative',
      price: '10.50',
    });
  });

  it('should return the response from the AI service with null values', async () => {
    const mockAnswerwithNull = {
      id: 1,
      name: 'Test Entry',
      date: new Date(),
      description: 'Test Description',
      taste: 'Test Taste',
      origin: 'Test Origin',
      recommendation: 'Test Recommendation',
      year: null,
      customerReview: 'Test Custom Review',
      rawMaterials: 'Test Raw Materials',
      alternative: 'Test Alternative',
      price: '10.50',
    };

    expect(feature.mapResponseToEntry(mockAnswerwithNull)).toEqual({
      id: expect.any(Number),
      date: expect.any(String),
      name: 'Test Entry',
      description: 'Test Description',
      taste: 'Test Taste',
      origin: 'Test Origin',
      recommendation: 'Test Recommendation',
      year: '',
      customerreview: 'Test Custom Review',
      rawmaterials: 'Test Raw Materials',
      alternative: 'Test Alternative',
      price: '10.50',
    });
  });
});

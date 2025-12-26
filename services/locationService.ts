import exifr from 'exifr';
import { GeoLocation, LocationInfo, ExifDetails } from '../types';

/**
 * Extracts GPS coordinates, Date, and Camera Details from an image file.
 */
export const extractImageMetadata = async (file: File): Promise<{ 
  location: GeoLocation | null, 
  date: Date | null,
  exifDetails: ExifDetails | null
}> => {
  try {
    // exifr.parse parses common tags including GPS, DateTimeOriginal, Make, Model, etc.
    const output = await exifr.parse(file);
    
    let location: GeoLocation | null = null;
    if (output && output.latitude && output.longitude) {
      location = {
        lat: output.latitude,
        lng: output.longitude
      };
    }

    let date: Date | null = null;
    if (output && output.DateTimeOriginal) {
      date = output.DateTimeOriginal;
    } else if (output && output.CreateDate) {
      date = output.CreateDate;
    }

    let exifDetails: ExifDetails | null = null;
    if (output) {
      exifDetails = {
        make: output.Make,
        model: output.Model,
        exposureTime: output.ExposureTime,
        fNumber: output.FNumber,
        iso: output.ISO,
        focalLength: output.FocalLength,
        lensModel: output.LensModel
      };
      
      // If object is empty/undefined values only, we might want to return null, 
      // but keeping it simple: valid object if parsing succeeded.
      const hasData = Object.values(exifDetails).some(val => val !== undefined);
      if (!hasData) exifDetails = null;
    }

    return { location, date, exifDetails };
  } catch (error) {
    console.error("Error parsing EXIF data:", error);
    return { location: null, date: null, exifDetails: null };
  }
};

/**
 * Reverse geocodes coordinates to a human-readable address using OpenStreetMap Nominatim.
 */
export const reverseGeocode = async (coords: GeoLocation): Promise<LocationInfo | null> => {
  try {
    // Using OSM Nominatim API (Free, requires User-Agent in headers ideally, handled by browser fetch)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=10`
    );
    
    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();
    
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.hamlet;
    const state = address.state || address.region;
    const country = address.country;
    
    return {
      city,
      state,
      country,
      displayName: data.display_name || `${city}, ${country}`
    };
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    return null;
  }
};
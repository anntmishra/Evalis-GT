# Image Export Troubleshooting Guide

## Issue: "[Image could not be displayed]" in PDF

### Root Cause
The issue occurs when blob URLs (created from uploaded files) can't be properly converted to base64 for PDF embedding.

### Solution Implemented

1. **Updated `loadImage()` function** in `pdfExportService.ts`:
   - Removed `crossOrigin` for blob URLs (they don't need CORS)
   - Added better error handling
   - Increased JPEG quality to 0.9
   - Added detailed console logging

2. **Added Debug Logging**:
   - Logs when processing each image
   - Shows image URL, data length, and dimensions
   - Helps identify where the conversion fails

### How to Debug

1. **Open Browser Console** (F12) when exporting PDF
2. **Look for these messages**:
   ```
   Processing image for question 1: blob:http://...
   Image loaded successfully, data length: 50000
   Image properties: {width: 800, height: 600}
   Calculated image dimensions: 130x97.5mm
   Image added to PDF at position (30, 100)
   ```

3. **If you see errors**:
   - `Error loading image`: The blob URL is invalid or expired
   - `Error converting image to base64`: Canvas conversion failed
   - `Error adding image to PDF`: jsPDF couldn't process the base64 data

### Common Issues & Fixes

#### Issue 1: Blob URL Expired
**Symptom**: Error loading image
**Cause**: Image was uploaded but blob URL was revoked
**Fix**: Don't revoke blob URLs until after PDF export

#### Issue 2: CORS Error
**Symptom**: Canvas tainted, can't export
**Cause**: Image from different origin with CORS restrictions
**Fix**: Already fixed - blob URLs don't use CORS

#### Issue 3: Large Image Files
**Symptom**: PDF export is slow or fails
**Cause**: Image file size too large (>5MB)
**Fix**: Already handled - 5MB limit enforced in upload

#### Issue 4: Invalid Image Format
**Symptom**: Can't get image properties
**Cause**: Unsupported image format
**Fix**: Validate image type on upload (JPEG, PNG, GIF)

### Testing Checklist

- [ ] Upload a small image (< 1MB)
- [ ] Add to question
- [ ] Export PDF immediately (don't wait too long)
- [ ] Check browser console for logs
- [ ] Verify image appears in PDF
- [ ] Test with different image formats (JPEG, PNG)
- [ ] Test with different image sizes
- [ ] Test multiple images in one paper

### Quick Test

1. Create a simple MCQ question
2. Add a small test image (take a screenshot)
3. Export to PDF immediately
4. Open console and check logs
5. Open PDF and verify image

### Expected Console Output (Success)

```
Processing image for question 1: blob:http://localhost:5173/abc-123-def
Image loaded successfully, data length: 123456
Image properties: Object { width: 1024, height: 768, ... }
Calculated image dimensions: 130x97.5mm
Image added to PDF at position (30, 85)
```

### Expected Console Output (Failure)

```
Processing image for question 1: blob:http://localhost:5173/abc-123-def
Error loading image: Error: Failed to load image
Error adding image to PDF for question 1: Error: Failed to load image
Image URL was: blob:http://localhost:5173/abc-123-def
```

### Alternative Solutions

If blob URLs continue to cause issues:

#### Option 1: Convert to Base64 Immediately
```typescript
const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Convert to base64 immediately
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    setCurrentImagePreview(base64); // Store base64 instead of blob
  };
  reader.readAsDataURL(file);
};
```

#### Option 2: Keep File Reference
```typescript
// Store file object and convert on demand
if (currentImage) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target?.result as string;
    // Use this base64 in PDF
  };
  reader.readAsDataURL(currentImage);
}
```

### Performance Considerations

**Blob URLs**: 
- ✅ Faster (no conversion)
- ✅ Less memory (just a reference)
- ❌ Can expire
- ❌ Need special handling for export

**Base64**:
- ❌ Slower (conversion time)
- ❌ More memory (full data in string)
- ✅ Never expires
- ✅ Works everywhere

### Recommendation

Current implementation (blob URLs) is optimal for UX. The fix applied should resolve the PDF export issue.

### Next Steps if Issue Persists

1. Check browser console logs
2. Try uploading a different image
3. Test with a very small image (< 100KB)
4. Clear browser cache
5. Try in incognito mode
6. Update to base64 approach if needed

### Status

✅ Fix applied to `pdfExportService.ts`
✅ Added comprehensive logging
✅ Improved error handling
⏳ Waiting for user testing

---

**Last Updated**: November 4, 2025
**Fixed By**: Image loading function update
**Test Status**: Ready for testing

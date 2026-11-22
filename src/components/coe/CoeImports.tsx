import React from 'react';
import BulkImportPanel from '../shared/BulkImportPanel';

const CoeImports = () => {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">Bulk Data Imports</h2>
        <p className="text-muted-foreground font-sans mt-1 text-sm">
          Upload an Excel file to bulk import Teachers or Students.
        </p>
      </div>

      <BulkImportPanel />
    </div>
  );
};

export default CoeImports;

/**
 * Utility function to handle printing in both browser and Electron.
 */
export function printDocument(): void {
  // Check if running in Electron
  if (typeof window !== 'undefined' && (window as any).electron?.isElectron) {
    // Use Electron native print via IPC
    (window as any).electron.print();
  } else {
    // Use standard browser print
    window.print();
  }
}

/**
 * Utility function to handle PDF export in both browser and Electron.
 */
export async function exportToPDF(filename: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electron?.isElectron) {
    // Use Electron native PDF export via IPC
    const result = await (window as any).electron.printToPDF(filename);
    if (result.success) {
      // result.path is available if needed
    } else if (result.error) {
      console.error('PDF Export Error:', result.error);
    }
  } else {
    // Browser fallback: standard print dialog (user can choose Save as PDF)
    window.print();
  }
}

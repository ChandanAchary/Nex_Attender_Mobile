import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Write CSV text to a temp file and open the native share sheet. */
export async function shareCsv(filename: string, content: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: filename });
  }
}

/** Write XLS (Excel HTML) text to a temp file and open the native share sheet. */
export async function shareXls(filename: string, content: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/vnd.ms-excel",
      dialogTitle: filename,
    });
  }
}


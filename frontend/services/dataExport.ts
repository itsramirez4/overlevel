import { Platform, Share } from 'react-native';

/**
 * Web downloads the JSON directly via a Blob; native has no filesystem
 * access without extra native modules, so it opens the OS share sheet
 * with the JSON as text instead — good enough to save or forward it.
 */
export const downloadOrShareJson = async (filename: string, data: unknown): Promise<void> => {
  const json = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ message: json, title: filename });
};

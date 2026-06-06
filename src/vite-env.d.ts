/// <reference types="vite/client" />

type FileSystemPermissionMode = "read" | "readwrite";

type FileSystemHandlePermissionDescriptor = {
  mode?: FileSystemPermissionMode;
};

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type OpenFilePickerOptions = {
  multiple?: boolean;
  types?: FilePickerAcceptType[];
};

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}

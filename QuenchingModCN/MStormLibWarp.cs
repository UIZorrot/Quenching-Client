using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Runtime.InteropServices;

namespace StormLibWarp
{
	class StormLib
	{
		/// <summary>
		/// Path to DLL file.
		/// </summary>
		public const string DLL = "StormLib.dll";

		public const uint STORMLIB_VERSION = 0x0815;
		public const string STORMLIB_VERSION_STRING = "8.21";

		public const uint ID_MPQ = 0x1A51504D;
		public const uint ID_MPQ_USERDATA = 0x1B51504D;

		public const uint ERROR_AVI_FILE = 10000;
		public const uint ERROR_UNKNOWN_FILE_KEY = 10001;
		public const uint ERROR_CHECKSUM_ERROR = 10002;
		public const uint ERROR_INTERNAL_FILE = 10003;
		public const uint ERROR_BASE_FILE_MISSING = 10004;
		public const uint ERROR_MARKED_FOR_DELETE = 10005;

		public const uint HASH_TABLE_SIZE_MIN = 0x00000004;
		public const uint HASH_TABLE_SIZE_DEFAULT = 0x00001000;
		public const uint HASH_TABLE_SIZE_MAX = 0x00080000;
		public const uint HASH_ENTRY_DELETED = 0xFFFFFFFE;
		public const uint HASH_ENTRY_FREE = 0xFFFFFFFF;
		public const uint HET_ENTRY_DELETED = 0x80;
		public const uint HET_ENTRY_FREE = 0x00;
		public const uint HASH_STATE_SIZE = 0x60;

		public const uint SFILE_OPEN_HARD_DISK_FILE = 2;
		public const uint SFILE_OPEN_CDROM_FILE = 3;
		public const uint SFILE_OPEN_FROM_MPQ = 0x00000000;
		public const uint SFILE_OPEN_BASE_FILE = 0xFFFFFFFD;
		public const uint SFILE_OPEN_ANY_LANG = 0xFFFFFFFE;
		public const uint SFILE_OPEN_LOCAL_FILE = 0xFFFFFFFF;

		public const uint SFILE_INVALID_SIZE = 0xFFFFFFFF;
		public const uint SFILE_INVALID_POS = 0xFFFFFFFF;
		public const uint SFILE_INVALID_ATTRIBUTES = 0xFFFFFFFF;

		public const uint SFILE_INFO_ARCHIVE_NAME = 1;
		public const uint SFILE_INFO_ARCHIVE_SIZE = 2;
		public const uint SFILE_INFO_MAX_FILE_COUNT = 3;
		public const uint SFILE_INFO_HASH_TABLE_SIZE = 4;
		public const uint SFILE_INFO_BLOCK_TABLE_SIZE = 5;
		public const uint SFILE_INFO_SECTOR_SIZE = 6;
		public const uint SFILE_INFO_HASH_TABLE = 7;
		public const uint SFILE_INFO_BLOCK_TABLE = 8;
		public const uint SFILE_INFO_NUM_FILES = 9;
		public const uint SFILE_INFO_STREAM_FLAGS = 10;
		public const uint SFILE_INFO_IS_READ_ONLY = 11;
		public const uint SFILE_INFO_HASH_INDEX = 100;
		public const uint SFILE_INFO_CODENAME1 = 101;
		public const uint SFILE_INFO_CODENAME2 = 102;
		public const uint SFILE_INFO_LANGID = 103;
		public const uint SFILE_INFO_BLOCKINDEX = 104;
		public const uint SFILE_INFO_FILE_SIZE = 105;
		public const uint SFILE_INFO_COMPRESSED_SIZE = 106;
		public const uint SFILE_INFO_FLAGS = 107;
		public const uint SFILE_INFO_POSITION = 108;
		public const uint SFILE_INFO_KEY = 109;
		public const uint SFILE_INFO_KEY_UNFIXED = 110;
		public const uint SFILE_INFO_FILETIME = 111;
		public const uint SFILE_INFO_PATCH_CHAIN = 112;

		public const uint SFILE_VERIFY_SECTOR_CRC = 0x00000001;
		public const uint SFILE_VERIFY_FILE_CRC = 0x00000002;
		public const uint SFILE_VERIFY_FILE_MD5 = 0x00000004;
		public const uint SFILE_VERIFY_RAW_MD5 = 0x00000008;
		public const uint SFILE_VERIFY_ALL = 0x0000000F;
		public const uint SFILE_VERIFY_MPQ_HEADER = 0x0001;
		public const uint SFILE_VERIFY_HET_TABLE = 0x0002;
		public const uint SFILE_VERIFY_BET_TABLE = 0x0003;
		public const uint SFILE_VERIFY_HASH_TABLE = 0x0004;
		public const uint SFILE_VERIFY_BLOCK_TABLE = 0x0005;
		public const uint SFILE_VERIFY_HIBLOCK_TABLE = 0x0006;
		public const uint SFILE_VERIFY_FILE = 0x0007;

		public const uint MPQ_PATCH_PREFIX_LEN = 0x20;

		public const uint MPQ_FLAG_READ_ONLY = 0x00000001;
		public const uint MPQ_FLAG_CHANGED = 0x00000002;
		public const uint MPQ_FLAG_PROTECTED = 0x00000004;
		public const uint MPQ_FLAG_CHECK_SECTOR_CRC = 0x00000008;
		public const uint MPQ_FLAG_NEED_FIX_SIZE = 0x00000010;
		public const uint MPQ_FLAG_INV_LISTFILE = 0x00000020;
		public const uint MPQ_FLAG_INV_ATTRIBUTES = 0x00000040;

		public const uint MPQ_FILE_IMPLODE = 0x00000100;
		public const uint MPQ_FILE_COMPRESS = 0x00000200;
		public const uint MPQ_FILE_COMPRESSED = 0x0000FF00;
		public const uint MPQ_FILE_ENCRYPTED = 0x00010000;
		public const uint MPQ_FILE_FIX_KEY = 0x00020000;
		public const uint MPQ_FILE_PATCH_FILE = 0x00100000;
		public const uint MPQ_FILE_SINGLE_UNIT = 0x01000000;
		public const uint MPQ_FILE_DELETE_MARKER = 0x02000000;
		public const uint MPQ_FILE_SECTOR_CRC = 0x04000000;
		public const uint MPQ_FILE_EXISTS = 0x80000000;
		public const uint MPQ_FILE_REPLACEEXISTING = 0x80000000;

		public const uint MPQ_COMPRESSION_HUFFMANN = 0x01;
		public const uint MPQ_COMPRESSION_ZLIB = 0x02;
		public const uint MPQ_COMPRESSION_PKWARE = 0x08;
		public const uint MPQ_COMPRESSION_BZIP2 = 0x10;
		public const uint MPQ_COMPRESSION_SPARSE = 0x20;
		public const uint MPQ_COMPRESSION_ADPCM_MONO = 0x40;
		public const uint MPQ_COMPRESSION_ADPCM_STEREO = 0x80;
		public const uint MPQ_COMPRESSION_LZMA = 0x12;
		public const uint MPQ_COMPRESSION_NEXT_SAME = 0xFFFFFFFF;

		public const uint MPQ_WAVE_QUALITY_HIGH = 0;
		public const uint MPQ_WAVE_QUALITY_MEDIUM = 1;
		public const uint MPQ_WAVE_QUALITY_LOW = 2;

		public const uint HET_TABLE_SIGNATURE = 0x1A544548;
		public const uint BET_TABLE_SIGNATURE = 0x1A544542;

		public const uint MPQ_KEY_HASH_TABLE = 0xC3AF3770;
		public const uint MPQ_KEY_BLOCK_TABLE = 0xEC83B3A3;

		public const uint MPQ_DATA_BITMAP_SIGNATURE = 0x33767470;

		public const string LISTFILE_NAME = "(listfile)";
		public const string SIGNATURE_NAME = "(signature)";
		public const string ATTRIBUTES_NAME = "(attributes)";
		public const string PATCH_METADATA_NAME = "(patch_metadata)";

		public const uint MPQ_FORMAT_VERSION_1 = 0;
		public const uint MPQ_FORMAT_VERSION_2 = 1;
		public const uint MPQ_FORMAT_VERSION_3 = 2;
		public const uint MPQ_FORMAT_VERSION_4 = 3;

		public const uint MPQ_ATTRIBUTE_CRC32 = 0x00000001;
		public const uint MPQ_ATTRIBUTE_FILETIME = 0x00000002;
		public const uint MPQ_ATTRIBUTE_MD5 = 0x00000004;
		public const uint MPQ_ATTRIBUTE_PATCH_BIT = 0x00000008;
		public const uint MPQ_ATTRIBUTE_ALL = 0x0000000F;
		public const uint MPQ_ATTRIBUTES_V1 = 100;

		public const uint BASE_PROVIDER_FILE = 0x00000000;
		public const uint BASE_PROVIDER_MAP = 0x00000001;
		public const uint BASE_PROVIDER_HTTP = 0x00000002;
		public const uint BASE_PROVIDER_MASK = 0x0000000F;

		public const uint STREAM_PROVIDER_LINEAR = 0x00000000;
		public const uint STREAM_PROVIDER_PARTIAL = 0x00000010;
		public const uint STREAM_PROVIDER_ENCRYPTED = 0x00000020;
		public const uint STREAM_PROVIDER_MASK = 0x000000F0;
		public const uint STREAM_FLAG_READ_ONLY = 0x00000100;
		public const uint STREAM_FLAG_WRITE_SHARE = 0x00000200;
		public const uint STREAM_FLAG_MASK = 0x0000FF00;
		public const uint STREAM_OPTIONS_MASK = 0x0000FFFF;

		public const uint MPQ_OPEN_NO_LISTFILE = 0x00010000;
		public const uint MPQ_OPEN_NO_ATTRIBUTES = 0x00020000;
		public const uint MPQ_OPEN_FORCE_MPQ_V1 = 0x00040000;
		public const uint MPQ_OPEN_CHECK_SECTOR_CRC = 0x00080000;
		public const uint MPQ_OPEN_READ_ONLY = STREAM_FLAG_READ_ONLY;
		public const uint MPQ_OPEN_ENCRYPTED = STREAM_PROVIDER_ENCRYPTED;

		public const uint MPQ_CREATE_ATTRIBUTES = 0x00100000;
		public const uint MPQ_CREATE_ARCHIVE_V1 = 0x00000000;
		public const uint MPQ_CREATE_ARCHIVE_V2 = 0x01000000;
		public const uint MPQ_CREATE_ARCHIVE_V3 = 0x02000000;
		public const uint MPQ_CREATE_ARCHIVE_V4 = 0x03000000;
		public const uint MPQ_CREATE_ARCHIVE_VMASK = 0x0F000000;

		public const uint MPQ_HEADER_SIZE_V1 = 0x20;
		public const uint MPQ_HEADER_SIZE_V2 = 0x2C;
		public const uint MPQ_HEADER_SIZE_V3 = 0x44;
		public const uint MPQ_HEADER_SIZE_V4 = 0xD0;

		public const uint FLAGS_TO_FORMAT_SHIFT = 24;

		public const uint VERIFY_OPEN_ERROR = 0x0001;
		public const uint VERIFY_READ_ERROR = 0x0002;

		public const uint VERIFY_FILE_HAS_SECTOR_CRC = 0x0004;
		public const uint VERIFY_FILE_SECTOR_CRC_ERROR = 0x0008;
		public const uint VERIFY_FILE_HAS_CHECKSUM = 0x0010;
		public const uint VERIFY_FILE_CHECKSUM_ERROR = 0x0020;
		public const uint VERIFY_FILE_HAS_MD5 = 0x0040;
		public const uint VERIFY_FILE_MD5_ERROR = 0x0080;
		public const uint VERIFY_FILE_HAS_RAW_MD5 = 0x0100;
		public const uint VERIFY_FILE_RAW_MD5_ERROR = 0x0200;

		public const uint ERROR_NO_SIGNATURE = 0;
		public const uint ERROR_VERIFY_FAILED = 1;
		public const uint ERROR_WEAK_SIGNATURE_OK = 2;
		public const uint ERROR_WEAK_SIGNATURE_ERROR = 3;
		public const uint ERROR_STRONG_SIGNATURE_OK = 4;
		public const uint ERROR_STRONG_SIGNATURE_ERROR = 5;

		public const uint MD5_DIGEST_SIZE = 0x10;
		public const uint SHA1_DIGEST_SIZE = 0x14;

		public const uint LANG_NEUTRAL = 0;
		public const uint LANG_CHINESE = 0x404;
		public const uint LANG_CZECH = 0x405;
		public const uint LANG_GERMAN = 0x407;
		public const uint LANG_ENGLISH = 0x409;
		public const uint LANG_SPANISH = 0x40a;
		public const uint LANG_FRENCH = 0x40c;
		public const uint LANG_ITALIAN = 0x410;
		public const uint LANG_JAPANESE = 0x411;
		public const uint LANG_KOREAN = 0x412;
		public const uint LANG_POLISH = 0x415;
		public const uint LANG_PORTUGUESE = 0x416;
		public const uint LANG_RUSSIAN = 0x419;

		public const uint CCB_CHECKING_FILES = 1;
		public const uint CCB_CHECKING_HASH_TABLE = 2;
		public const uint CCB_COPYING_NON_MPQ_DATA = 3;
		public const uint CCB_COMPACTING_FILES = 4;
		public const uint CCB_CLOSING_ARCHIVE = 5;

		public const uint SIZE_OF_XFRM_HEADER = 0x0C;

		public const uint FILE_BEGIN = 0;
		public const uint FILE_CURRENT = 1;
		public const uint FILE_END = 2;

		//Manipulating MPQ archives
		/// <summary>
		/// Function SFileOpenArchive opens a MPQ archive. During the open operation, the archive is checked for corruptions, internal (listfile) and (attributes) are loaded, unless specified otherwise.
		/// The archive is open for read and write operations, unless MPQ_OPEN_READ_ONLY is specified.
		/// </summary>
		/// <param name="szMpqName">Archive file name to open.</param>
		/// <param name="dwPriority">Priority of the archive for later search. StormLib does not use this parameter, set it to zero.</param>
		/// <param name="dwFlags">Flags that specify additional options about how to open the file. Several flags can be combined that can tell StormLib where to open the MPQ from, and what's the stream type of the MPQ.
		/// Note that the BASE_PROVIDER_*, STREAM_PROVIDER_* and STREAM_FLAG_* are valid since StormLib v 8.10.</param>
		/// <param name="phMpq">Pointer to a variable of HANDLE type, where the opened archive handle will be stored.</param>
		/// <returns>When the function succeeds, it returns nonzero and phMPQ contains the handle of the opened archive. When the archive cannot be open, function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileOpenArchive")]
		public static extern bool SFileOpenArchive(string szMpqName, uint dwPriority, uint dwFlags, ref uint phMpq);
		/// <summary>
		/// Function SFileCreateArchive opens or creates the MPQ archive. The function can also convert an existing file to MPQ archive. The MPQ archive is always open for write operations. The function internally verifies the file using SFileOpenArchive. If the file already exists and it is an MPQ archive, the function fails and GetLastError() returns ERROR_ALREADY_EXISTS.
		/// </summary>
		/// <param name="szMpqName">Archive file name to be created.</param>
		/// <param name="dwFlags">Specifies additional flags for MPQ creation process.</param>
		/// <param name="dwMaxFileCount">File count limit. The value must be in range of HASH_TABLE_SIZE_MIN (0x04) and HASH_TABLE_SIZE_MAX (0x80000). StormLib will automatically calculate size of hash tables and block tables from this value.</param>
		/// <param name="phMpq">Pointer to a variable of HANDLE type, where the opened archive handle will be stored.</param>
		/// <returns>When the function succeeds, it returns nonzero and phMPQ contains the handle of the new archive. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileCreateArchive")]
		public static extern bool SFileCreateArchive(string szMpqName, uint dwFlags, uint dwMaxFileCount, ref uint phMpq);
		/// <summary>
		/// SFileAddListFile adds an external listfile to the open MPQ. Note that the listfile is merely added to the memory structures of the open MPQ. On-disk structures of the MPQ are not changed. Use this function to specify an extra listfile to an opened MPQ, for example when there is no internal listfile, or if the internal listfile is not complete.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ.</param>
		/// <param name="szListFile">Listfile name to add. If this parameter is NULL, the function adds the internal listfile from the MPQ, if present. Adding the same listfile multiple times has no effect.</param>
		/// <returns>When the function succeeds, it returns ERROR_SUCCESS. On an error, the function returns error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileAddListFile")]
		public static extern bool SFileAddListFile(uint hMpq, string szListFile);
		/// <summary>
		/// Function SFileSetLocale sets a preferred locale for file functions, such as SFileOpenFileEx or SFileAddFileEx. The locale is stored as a global variable and thus affects every open or add operation.
		/// Note that this function does not change locale ID of any existing file in the MPQ.
		/// </summary>
		/// <param name="lcNewLocale">Locale ID to be set.</param>
		/// <returns>The function never fails and always returns lcNewLocale.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetLocale")]
		public static extern uint SFileSetLocale(uint lcNewLocale);
		/// <summary>
		/// Function SFileGetLocale returns locale that is set as a preferred locale for files that will be open by SFileOpenFileEx and added by SFileAddFileEx. The locale is stored as a global variable and thus affects every open or add operation.
		/// </summary>
		/// <returns>The function never fails and always returns current locale ID.</returns>
		[DllImport(DLL, EntryPoint = "SFileGetLocale")]
		public static extern uint SFileGetLocale();
		/// <summary>
		/// Function SFileFlushArchive saves any in-memory structures to the MPQ archive on disk. Due to performance reasons, StormLib caches several data structures in memory (e.g. block table or hash table). When a file is added to the MPQ, those structures are only updated in memory. Calling SFileFlushArchive forces saving in-memory MPQ tables to the file, preventing a MPQ corruption incase of power down or crash of the calling application. Note that this function is called internally when the archive is closed.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ.</param>
		[DllImport(DLL, EntryPoint = "SFileFlushArchive")]
		public static extern bool SFileFlushArchive(uint hMpq);
		/// <summary>
		/// Function SFileFlushArchive saves any in-memory structures to the MPQ archive on disk. Due to performance reasons, StormLib caches several data structures in memory (e.g. block table or hash table). When a file is added to the MPQ, those structures are only updated in memory. Calling SFileFlushArchive forces saving in-memory MPQ tables to the file, preventing a MPQ corruption incase of power down or crash of the calling application. Note that this function is called internally when the archive is closed.
		/// </summary>
		/// <param name="phMpq"> Handle to an open MPQ.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileCloseArchive")]
		public static extern bool SFileCloseArchive(uint phMpq);
		/// <summary>
		/// Function SFileSetMaxFileCount changes the limit for number of files that can be stored in the archive. No files are changed during this operation.
		/// </summary>
		/// <param name="hMpq">Handle to an open archive. This handle must have been obtained by SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="dwMaxFileCount">New size of the hash table. This parameter must be in range of HASH_TABLE_SIZE_MIN and HASH_TABLE_SIZE_MAX.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetMaxFileCount")]
		public static extern bool SFileSetMaxFileCount(uint hMpq, uint dwMaxFileCount);
		/// <summary>
		/// SFileCompactArchive might take several minutes to complete, depending on size of the archive being rebuilt. If you want to use SFileCompactArchive in your application, you can utilize a compact callback, which can be set by SFileSetCompactCallback.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive.</param>
		/// <param name="szListFile">Allows to specify an additional listfile, that will be used together with internal listfile. Can be NULL.</param>
		/// <param name="bReserved">Not used, set to zero.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileCompactArchive")]
		public static extern bool SFileCompactArchive(uint hMpq, string szListFile, bool bReserved);
		/// <summary>
		/// Function SFileSetCompactCallback sets a callback that will be called during operations performed by SFileCompactArchive. Registering a callback will help the calling application to show a progress about the operation, which will enhance user experience with the application.
		/// </summary>
		/// <param name="hMpq">Handle to the MPQ that will be compacted. Current version of StormLib ignores the parameter, but it is recommended to set it to the handle of the archive.</param>
		/// <param name="pfnCompactCB">Pointer to the callback function. For the prototype and parameters, see below.</param>
		/// <param name="pvUserData">User defined data that will be passed to the callback function.</param>
		/// <returns>The function never fails and always sets the callback.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetCompactCallback")]
		public static extern bool SFileSetCompactCallback(uint hMpq, SFILE_COMPACT_CALLBACK pfnCompactCB, IntPtr pvUserData);

		//Using patched archives
		/// <summary>
		/// Function SFileOpenPatchArchive adds a patch archive to the existing open MPQ. The MPQ must have been open by SFileOpenArchive, and also with MPQ_OPEN_READ_ONLY specified. The patch archive is added to the list of patches that belong to the primary MPQ. No handle is returned, and the patch(es) is closed when the primary MPQ handle is closed. The patch MPQ opened during the process is maintained internally by StormLib and cannot be accessed directly.
		/// </summary>
		/// <param name="hMpq">Handle to a MPQ that serves as primary MPQ when patched.</param>
		/// <param name="szMpqName">Name of the patch MPQ to be added.</param>
		/// <param name="szPatchPathPrefix">Pointer to patch prefix for file names. This parameter can be NULL, which makes StormLib to determine patch prefix for the specific combination of names of the base MPQ and patch MPQ.</param>
		/// <param name="dwFlags">Reserved for future use.</param>
		/// <returns>When the function succeeds, it returns nonzero. When the archive cannot be added as patch archive, function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileOpenPatchArchive")]
		public static extern bool SFileOpenPatchArchive(uint hMpq, string szMpqName, string szPatchPathPrefix, uint dwFlags);
		/// <summary>
		/// Function SFileIsPatchedArchive returns true, if the given MPQ has one or more patches added.
		/// </summary>
		/// <param name="hMpq">Handle to a MPQ in question.</param>
		/// <returns>The function returns true, when there is at least one patch added to the MPQ. Otherwise, it returns false.</returns>
		[DllImport(DLL, EntryPoint = "SFileIsPatchedArchive")]
		public static extern bool SFileIsPatchedArchive(uint hMpq);

		//Reading files
		/// <summary>
		/// Function SFileOpenFileEx opens a file from MPQ archive. The file is only open for read. The file must be closed by calling SFileCloseFile. All files must be closed before the MPQ archive is closed.
		/// </summary>
		/// <param name="hMpq">Handle to an open archive.</param>
		/// <param name="szFileName">Name or index of the file to open.</param>
		/// <param name="dwSearchScope">Value that specifies how exactly the file should be open.</param>
		/// <param name="phFile">Pointer to a variable of HANDLE type, that will receive HANDLE to the open file.</param>
		/// <returns>When the function succeeds, it returns nonzero and phFile contains the handle of the opened file. When the file cannot be open, function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileOpenFileEx")]
		public static extern bool SFileOpenFileEx(uint hMpq, string szFileName, uint dwSearchScope, ref uint phFile);
		/// <summary>
		/// Function SFileGetFileSize retrieves the size of an open file.
		/// </summary>
		/// <param name="hMpq">Handle to an open file. The file handle must have been created by SFileOpenFileEx.</param>
		/// <param name="pdwFileSizeHigh">Receives high 32 bits of the a file size. This parameter can be NULL.</param>
		/// <returns>When the function succeeds, it returns lower 32-bit of the file size. On an error, it returns SFILE_INVALID_SIZE and GetLastError returns an error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileGetFileSize")]
		public static extern uint SFileGetFileSize(uint hMpq, ref uint pdwFileSizeHigh);
		/// <summary>
		/// Function SFileSetFilePointer sets current position in an open file.
		/// </summary>
		/// <param name="hMpq">Handle to an open file. The file handle must have been created by SFileOpenFileEx.</param>
		/// <param name="lFilePos"> Low 32 bits of new position in the file.</param>
		/// <param name="plFilePosHigh">Pointer to a high 32 bits of new position in the file.</param>
		/// <param name="dwMoveMethod">The starting point for the file pointer move.</param>
		/// <returns>When the function succeeds, it returns lower 32-bit of the file size. On an error, it returns SFILE_INVALID_SIZE and GetLastError returns an error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetFilePointer")]
		public static extern uint SFileSetFilePointer(uint hMpq, int lFilePos, ref int plFilePosHigh, uint dwMoveMethod);
		/// <summary>
		/// Function SFileReadFile reads data from an open file.
		/// </summary>
		/// <param name="hMpq">Handle to an open file. The file handle must have been created by SFileOpenFileEx.</param>
		/// <param name="lpBuffer">Pointer to buffer that will receive loaded data. The buffer size must be greater or equal to dwToRead.</param>
		/// <param name="dwToRead">Number of bytes to be read.</param>
		/// <param name="pdwRead">Pointer to DWORD that will receive number of bytes read.</param>
		/// <param name="lpOverlapped">If hFile is handle to a local disk file, lpOverlapped is passed to ReadFile. Otherwise not used.</param>
		/// <returns>When all requested bytes have been read, the function returns true. When less than requested bytes have been read, the function returns false and GetLastError returns ERROR_HANDLE_EOF. If an error occured, the function returns false and GetLastError returns an error code different from ERROR_HANDLE_EOF.</returns>
		[DllImport(DLL, EntryPoint = "SFileReadFile")]
		public static extern bool SFileReadFile(uint hMpq, IntPtr lpBuffer, uint dwToRead, ref uint pdwRead, [MarshalAs(UnmanagedType.LPStruct)] IntPtr lpOverlapped);
		/// <summary>
		/// Function SFileCloseFile closes an open MPQ file. All in-memory data are freed. After this function finishes, the hFile handle is no longer valid and must not be used in any file operations.
		/// </summary>
		/// <param name="hFile">Handle to an open file.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileCloseFile")]
		public static extern bool SFileCloseFile(uint hFile);
		/// <summary>
		/// Function SFileHasFile performs a quick check if a file exists within the MPQ archive. The function does not perform file open, not even internally. It merely checks hash table if the file is present.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ.</param>
		/// <param name="szFileName">Name of the file to check.</param>
		/// <returns>When the file is present in the MPQ, function returns true. When the file is not present in the MPQ archive, the function returns false and GetLastError returns ERROR_FILE_NOT_FOUND. If an error occured, the function returns false and GetLastError returns an error code different than ERROR_FILE_NOT_FOUND.</returns>
		[DllImport(DLL, EntryPoint = "SFileHasFile")]
		public static extern bool SFileHasFile(uint hMpq, string szFileName);
		/// <summary>
		/// Function SFileGetFileName retrieves the name of an open file.
		/// </summary>
		/// <param name="hMpq">Handle to an open file. The file handle must have been created by SFileOpenFileEx.</param>
		/// <param name="szFileName">Receives the file name. The buffer must be at least MAX_PATH characters long.</param>
		/// <returns>When the function succeeds, it returns true and buffer pointed by szFileName contains name of the file. On an error, the function returns false and GetLastError returns an error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileGetFileName")]
		public static extern bool SFileGetFileName(uint hMpq, ref string szFileName);
		/// <summary>
		/// Function SFileGetFileInfo retrieves an information about an open MPQ archive or a file.
		/// </summary>
		/// <param name="hMpqOrFile">Handle to an open file or to an open MPQ archive, depending on the value of dwInfoType.</param>
		/// <param name="dwInfoType">Type of information to retrieve. See Return Value for more information.</param>
		/// <param name="pvFileInfo">Pointer to buffer where to store the required information.</param>
		/// <param name="cbFileInfo">Size of the buffer pointed by pvFileInfo.</param>
		/// <param name="pcbLengthNeeded">Size, in bytes, needed to store the information into pvFileInfo.</param>
		/// <returns>When the function succeeds, it returns true. On an error, the function returns false and GetLastError returns error code. Possible error codes may be ERROR_INVALID_PARAMETER (unknown file info type) or ERROR_INSUFFICIENT_BUFFER (not enough space in the supplied buffer).</returns>
		[DllImport(DLL, EntryPoint = "SFileGetFileInfo")]
		public static extern bool SFileGetFileInfo(uint hMpqOrFile, uint dwInfoType, IntPtr pvFileInfo, uint cbFileInfo, ref uint pcbLengthNeeded);
		/// <summary>
		/// Function SFileVerifyFile verifies the file by its CRC and MD5. The (attributes) file must exist in the MPQ and must have been open by SFileOpenArchive or created by SFileCreateArchive. The entire file is always checked for readability. Additional flags in dwFlags turn on extra checks on the file.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ archive.</param>
		/// <param name="szFileName">Name of a file to verify.</param>
		/// <param name="dwFlags">Specifies what to verify.</param>
		/// <returns>Return value is zero when no problerms were found.</returns>
		[DllImport(DLL, EntryPoint = "SFileVerifyFile")]
		public static extern uint SFileVerifyFile(uint hMpq, string szFileName, uint dwFlags);
		/// <summary>
		/// Function SFileVerifyArchive verifies digital signature of the archive, is a digital signature is present. in the MPQ and must have been open by SFileOpenArchive. Note that MPQ archives created by StormLib are never signed.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ archive to be verified.</param>
		/// <returns>Return value can be one of the following values:</returns>
		[DllImport(DLL, EntryPoint = "SFileVerifyArchive")]
		public static extern uint SFileVerifyArchive(uint hMpq);
		/// <summary>
		/// Function SFileExtractFile extracts one file from an MPQ archive.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ archive.</param>
		/// <param name="szToExtract">Name of a file within the MPQ that is to be extracted.</param>
		/// <param name="szExtracted">Specifies the name of a local file that will be created and will contain data from the extracted MPQ file.</param>
		/// <param name="dwSearchScope">This parameter refines the definition of what to extract. If you want ot extract an unpatched file, use SFILE_OPEN_FROM_MPQ (this is the default parameter). If you want to extract patched version of the file, use SFILE_OPEN_PATCHED_FILE.</param>
		/// <returns>If the MPQ file has been successfully extracted into the target file, the function returns true. On an error, the function returns false and GetLastError returns an error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileExtractFile")]
		public static extern bool SFileExtractFile(uint hMpq, string szToExtract, string szExtracted, uint dwSearchScope);

		//File searching
		/// <summary>
		/// Function SFileFindFirstFile searches an MPQ archive and returns name of the first file that matches the given search mask and exists in the MPQ archive. When the caller finishes searching, the returned handle must be freed by calling SFileFindClose.
		/// </summary>
		/// <param name="hMpq">Handle to an open archive.</param>
		/// <param name="szMask">Name of the search mask. "*" will return all files.</param>
		/// <param name="lpFindFileData">Pointer to SFILE_FIND_DATA structure that will receive information about the found file.</param>
		/// <param name="szListFile">Name of an extra list file that will be used for searching. Note that SFileAddListFile is called internally. The internal listfile in the MPQ is always used (if exists). This parameter can be NULL.</param>
		/// <returns>When the function succeeds, it returns handle to the MPQ search object and the SFILE_FIND_DATA structure is filled with information about the file. On an error, the function returns NULL and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileFindFirstFile")]
		public static extern uint SFileFindFirstFile(uint hMpq, string szMask, [MarshalAs(UnmanagedType.LPStruct)] SFILE_FIND_DATA lpFindFileData, string szListFile);
		/// <summary>
		/// Function SFileFindNextFile continues search that has been initiated by SFileFindFirstFile. When the caller finishes searching, the returned handle must be freed by calling SFileFindClose.
		/// </summary>
		/// <param name="hFind">Search handle. Must have been obtained by call to SFileFindFirstFile.</param>
		/// <param name="lpFindFileData">Pointer to SFILE_FIND_DATA structure that will receive information about the found file. For layout of the structure, see SFileFindFirstFile.</param>
		/// <returns>When the function succeeds, it returns nonzero and the SFILE_FIND_DATA structure is filled with information about the file. On an error, the function returns zero and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileFindNextFile")]
		public static extern bool SFileFindNextFile(uint hFind, [MarshalAs(UnmanagedType.LPStruct)] SFILE_FIND_DATA lpFindFileData);
		/// <summary>
		/// Function SFileFindClose closes a find handle that has been created by SFileFindFirstFile.
		/// </summary>
		/// <param name="hFind">Search handle. Must have been obtained by call to SFileFindFirstFile.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns zero and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileFindClose")]
		public static extern bool SFileFindClose(uint hFind);
		/// <summary>
		/// Function SListFileFindFirstFile searches a listfile and returns name of the first file that matches the given search mask. When the caller finishes searching, the returned handle must be freed by calling SListFileFindClose. Note that unlike SFileFindFirstFile, this function does not check if the file exists within the archive and doesn't call SFileAddListFile.
		/// </summary>
		/// <param name="hMpq">Handle to an open archive. This parameter must only be valid if szListFile is NULL.</param>
		/// <param name="szListFile">Name of the listfile that will be used for searching. If this parameter is NULL, the function searches the MPQ internal listfile (if any).</param>
		/// <param name="szMask">Name of the search mask. "*" will return all files.</param>
		/// <param name="lpFindFileData">Pointer to SFILE_FIND_DATA structure that will receive name of the found file. For layout of this structure, see SFileFindFirstFile.</param>
		/// <returns>When the function succeeds, it returns handle to the MPQ search object and the cFileName member of SFILE_FIND_DATA structure is filled with name of the file. On an error, the function returns NULL and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SListFileFindFirstFile")]
		public static extern uint SListFileFindFirstFile(uint hMpq, string szListFile, string szMask, [MarshalAs(UnmanagedType.LPStruct)] SFILE_FIND_DATA lpFindFileData);
		/// <summary>
		/// Function SListFileFindNextFile continues listfile searching initiated by SListFileFindFirstFile.
		/// </summary>
		/// <param name="hFind">Search handle. Must have been obtained by call to SListFileFindFirstFile.</param>
		/// <param name="lpFindFileData">Pointer to SFILE_FIND_DATA structure that will receive name of the found file. For layout of the structure, see SFileFindFirstFile.</param>
		/// <returns>When the function succeeds, it returns nonzero and the cFileName member of SFILE_FIND_DATA structure is filled with name of the file. On an error, the function returns zero and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SListFileFindNextFile")]
		public static extern uint SListFileFindNextFile(uint hFind, [MarshalAs(UnmanagedType.LPStruct)] SFILE_FIND_DATA lpFindFileData);
		/// <summary>
		/// Function SListFileFindClose closes a find handle that has been created by SListFileFindFirstFile.
		/// </summary>
		/// <param name="hFind">Search handle. Must have been obtained by call to SListFileFindFirstFile.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns zero and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SListFileFindClose")]
		public static extern bool SListFileFindClose(uint hFind);
		/// <summary>
		/// Function SFileEnumLocales enumerates all locales for the given file that are present in the MPQ.
		/// </summary>
		/// <param name="hMpq">Handle to a MPQ.</param>
		/// <param name="szFileName">Name of a file to enumerate the locales.</param>
		/// <param name="plcLocales">An array of LCIDs that will receive locales. This parameter can be NULL if pdwMaxLocales points to zero.</param>
		/// <param name="pdwMaxLocales"> On input, this argument must point to a variable that contains maximum number of entries in plcLocales array. On output, this variable receives number of locales that are for the file. This argument cannot be NULL.</param>
		/// <param name="dwSearchScope">This parameter is ignored.</param>
		/// <returns>When the function succeeds, it returns ERROR_SUCCESS. On an error, the function returns an error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileEnumLocales")]
		public static extern bool SListFileFindClose(uint hMpq, string szFileName, ref uint plcLocales, ref uint pdwMaxLocales, uint dwSearchScope);

		//Adding files to MPQ
		/// <summary>
		/// Function SFileCreateFile creates a new file within archive and prepares it for storing the data.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szArchivedName">A name under which the file will be stored into the MPQ.</param>
		/// <param name="FileTime">Specifies the file date-time that will be stored into "(attributes)" file in MPQ. This parameter is optional and can be zero.</param>
		/// <param name="dwFileSize">Specifies the size of the data that will be written to the file. This size of the file is set by the call and cannot be changed. The subsequent amount of data written must exactly match the size given by this parameter.</param>
		/// <param name="lcLocale">Specifies the locale for the new file.</param>
		/// <param name="dwFlags">Specifies additional options about how to add the file to the MPQ. For more information about these flags, see SFileAddFileEx.</param>
		/// <param name="phFile">Pointer to a variable of HANDLE type that receives a valid handle. Note that this handle can only be used in call to SFileWriteFile and SFileFinishFile. This handle must never be passed to another file function. Moreover, this handle must always be freed by SFileFinishFile, if not NULL.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileCreateFile")]
		public static extern bool SFileCreateFile(uint hMpq, string szArchivedName, ulong FileTime, uint dwFileSize, uint lcLocale, uint dwFlags, ref uint phFile);
		/// <summary>
		/// Function SFileWriteFile writes data to the archive. The file must have been created by SFileCreateFile.
		/// </summary>
		/// <param name="hMpq">Handle to a new file within MPQ. This handle must have been obtained by calling SFileCreateFile.</param>
		/// <param name="pvData">Pointer to data to be written to the file.</param>
		/// <param name="dwSize">Size of the data that are to be written to the MPQ.</param>
		/// <param name="dwCompression">Specifies the type of data compression that is to be applied to the data, in case the amount of the data will reach size of one file sector. For more information about the available compressions, see SFileAddFileEx.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileWriteFile")]
		public static extern bool SFileWriteFile(uint hMpq, IntPtr pvData, uint dwSize, uint dwCompression);
		/// <summary>
		/// Function SFileFinishFile finalized creation of the archived file. The file must have been created by SFileCreateFile.
		/// </summary>
		/// <param name="hFile">Handle to a new file within MPQ. This handle must have been obtained by calling SFileCreateFile.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileFinishFile")]
		public static extern bool SFileFinishFile(uint hFile);
		/// <summary>
		/// Function SFileAddFileEx adds a file to the MPQ archive. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation might cause MPQ fragmentation. To reduce size of the MPQ, use SFileCompactArchive.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szfileName">Name of a file to be added to the MPQ.</param>
		/// <param name="szArchivedName">A name under which the file will be stored into the MPQ. This does not have to be the same like the original file name.</param>
		/// <param name="dwFlags">Specifies additional options about how to add the file to the MPQ.</param>
		/// <param name="dwCompression">Compression method of the first file block. This parameter is ignored if MPQ_FILE_COMPRESS is not specified in dwFlags. </param>
		/// <param name="dwCompressionNext">Compression method of rest of the file. This parameter optional and is ignored if MPQ_FILE_COMPRESS is not specified in dwFlags.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileAddFileEx")]
		public static extern bool SFileAddFileEx(uint hMpq, string szfileName, string szArchivedName, uint dwFlags, uint dwCompression, uint dwCompressionNext);
		/// <summary>
		/// Function SFileAddFile adds a file to the MPQ archive. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation might cause MPQ fragmentation. To reduce size of the MPQ, use SFileCompactArchive.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szfileName">Name of a file to be added to the MPQ.</param>
		/// <param name="szArchivedName">A name under which the file will be stored into the MPQ. This does not have to be the same like the original file name.</param>
		/// <param name="dwFlags">Specifies additional options about how to add the file to the MPQ. For more information about these flags, see SFileAddFileEx.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileAddFile")]
		public static extern bool SFileAddFile(uint hMpq, string szfileName, string szArchivedName, uint dwFlags);
		/// <summary>
		/// Function SFileAddWave adds a WAVE file to the MPQ archive. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation might cause MPQ fragmentation. To reduce size of the MPQ, use SFileCompactArchive. This function is obsolete. WAVE files should be stored the same way like normal data files.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szfileName">Name of a file to be added to the MPQ.</param>
		/// <param name="szArchivedName">A name under which the file will be stored into the MPQ. This does not have to be the same like the original file name.</param>
		/// <param name="dwFlags">Specifies additional options about how to add the file to the MPQ. For more information about these flags, see SFileAddFileEx.</param>
		/// <param name="dwQuality">Specifies quality of WAVE compression. This parameter is ignored if MPQ_FILE_COMPRESS is not specified in dwFlags.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileAddWave")]
		public static extern bool SFileAddWave(uint hMpq, string szfileName, string szArchivedName, uint dwFlags, uint dwQuality);
		/// <summary>
		/// Function SFileRemoveFile removes a file from MPQ. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation leaves a gap in the MPQ file. To reduce size of the MPQ, use SFileCompactArchive.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szFileName">Name of a file to be removed.</param>
		/// <param name="dwSearchScope">This parameter is ignored in the current version of StormLib.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileRemoveFile")]
		public static extern bool SFileRemoveFile(uint hMpq, string szFileName, uint dwSearchScope);
		/// <summary>
		/// Function SFileRenameFile renames a file within MPQ. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation does not cause MPQ fragmentation and thus it is not necessary to compact the archive.
		/// </summary>
		/// <param name="hMpq">Handle to an open MPQ. This handle must have been obtained by calling SFileOpenArchive or SFileCreateArchive.</param>
		/// <param name="szOldFileName">Name of a file to be renamed.</param>
		/// <param name="szNewFileName">New name of the file.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileRenameFile")]
		public static extern bool SFileRenameFile(uint hMpq, string szOldFileName, string szNewFileName);
		/// <summary>
		/// Function SFileSetFileLocale sets new locale ID for an open file. The locale ID is changed in the block table of the MPQ. The MPQ must have been open by SFileOpenArchive or created by SFileCreateArchive. Note that this operation does not cause MPQ fragmentation and thus it is not necessary to compact the archive.
		/// </summary>
		/// <param name="hFile">Handle to the file in the MPQ. This handle must have been obtained by calling SFileOpenFileEx.</param>
		/// <param name="lcNewLocale">New locale ID for the file. For more onformation about locales, see SFileSetLocale.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetFileLocale")]
		public static extern bool SFileSetFileLocale(uint hFile, uint lcNewLocale);
		/// <summary>
		/// Function SFileSetDataCompression configures compression mask for subsequent calls to SFileAddFile. The compression mask is remembered until changed.
		/// </summary>
		/// <param name="DataCompression">Bit mask of data compression.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns false and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetDataCompression")]
		public static extern bool SFileSetDataCompression(uint DataCompression);
		/// <summary>
		/// Function SFileSetAddFileCallback sets a callback that will be called during operations performed by SFileAddFileEx. Registering a callback will help the calling application to show a progress about the operation, which enhances user experience with the application.
		/// </summary>
		/// <param name="hMpq">Handle to the MPQ that will be compacted. Current version of StormLib ignores the parameter, but it is recommended to set it to the handle of the archive.</param>
		/// <param name="pfnAddFileCB">Pointer to the callback function. For the prototype and parameters, see below.</param>
		/// <param name="pvUserData">User defined data that will be passed to the callback function.</param>
		/// <returns>The function never fails and always sets the callback.</returns>
		[DllImport(DLL, EntryPoint = "SFileSetAddFileCallback")]
		public static extern bool SFileSetAddFileCallback(uint hMpq, SFILE_ADDFILE_CALLBACK pfnAddFileCB, IntPtr pvUserData);

		//Compression functions
		/// <summary>
		/// SCompImplode compresses a data buffer, using Pkware Data Compression library's IMPLODE method.
		/// </summary>
		/// <param name="pbOutBuffer">Pointer to buffer where the compressed data will be stored.</param>
		/// <param name="pcbOutBuffer">On call, pointer to the length of the buffer in pbOutBuffer. When finished, this variable receives length of the compressed data.</param>
		/// <param name="pbInBuffer">Pointer to data that are to be imploded.</param>
		/// <param name="cbInBuffer">Length of the data pointed by pbInBuffer.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns FALSE and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SCompImplode")]
		public static extern int SCompImplode(byte[] pbOutBuffer, ref int pcbOutBuffer, byte[] pbInBuffer, int cbInBuffer);
		/// <summary>
		/// SCompExplode decompresses a data block compressed by SCompImplode.
		/// </summary>
		/// <param name="pbOutBuffer">Pointer to buffer where the decompressed data will be stored.</param>
		/// <param name="pcbOutBuffer">On call, pointer to the length of the buffer in pbOutBuffer. When finished, this variable receives length of the decompressed data.</param>
		/// <param name="pbInBuffer">Pointer to data that are to be exploded.</param>
		/// <param name="cbInBuffer">Length of the data pointed by pbInBuffer.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns FALSE and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SCompExplode")]
		public static extern int SCompExplode(byte[] pbOutBuffer, ref int pcbOutBuffer, byte[] pbInBuffer, int cbInBuffer);
		/// <summary>
		/// SCompCompress compresses a data buffer, using various compression methods.
		/// </summary>
		/// <param name="pvOutBuffer">Pointer to buffer where the compressed data will be stored.</param>
		/// <param name="pcbOutBuffer">On call, pointer to the length of the buffer in pbOutBuffer. When finished, this variable receives length of the compressed data.</param>
		/// <param name="pbInBuffer">Pointer to data that are to be imploded.</param>
		/// <param name="cbInBuffer">Length of the data pointed by pbInBuffer.</param>
		/// <param name="uCompressionMask">Bit mask that specifies compression methods to use. For possible values of this parameter, see SFileAddFileEx.</param>
		/// <param name="nCmpType">An extra parameter, specific to compression type. This parameter is only used internally by Huffmann compression when applied after an ADPCM compression.</param>
		/// <param name="nCmpLevel">An extra parameter, specific to compression type. This parameter is used by ADPCM compression and is related to WAVE quality. See Remarks section for additional information.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns FALSE and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SCompCompress")]
		public static extern int SCompCompress(IntPtr pvOutBuffer, ref int pcbOutBuffer, IntPtr pbInBuffer, int cbInBuffer, uint uCompressionMask, int nCmpType, int nCmpLevel);
		/// <summary>
		/// SCompDecompress decompresses a data block compressed by SCompCompress.
		/// </summary>
		/// <param name="pbOutBuffer">Pointer to buffer where the decompressed data will be stored.</param>
		/// <param name="pcbOutBuffer">On call, pointer to the length of the buffer in pbOutBuffer. When finished, this variable receives length of the decompressed data.</param>
		/// <param name="pbInBuffer">Pointer to data that are to be exploded.</param>
		/// <param name="cbInBuffer">Length of the data pointed by pbInBuffer.</param>
		/// <returns>When the function succeeds, it returns nonzero. On an error, the function returns FALSE and GetLastError gives the error code.</returns>
		[DllImport(DLL, EntryPoint = "SCompDecompress")]
		public static extern int SCompDecompress(IntPtr pbOutBuffer, ref int pcbOutBuffer, IntPtr pbInBuffer, int cbInBuffer);

		//Common delegates and struct
		/// <summary>
		/// Callback function used by SFileSetCompactCallback.
		/// </summary>
		/// <param name="pvUserData">User data pointer that has been passed to SFileSetCompactCallback.</param>
		/// <param name="dwWorkType">Contains identifier of the work that is currently being done.</param>
		/// <param name="pBytesProcessed">Pointer to Int64, indicating what part of the archive has already been compacted.</param>
		/// <param name="pTotalBytes">Pointer to Int64, containing total number of bytes that has to be compacted.</param>
		public delegate void SFILE_COMPACT_CALLBACK(
			IntPtr pvUserData,
			uint dwWorkType,
			ref Int64 pBytesProcessed,
			ref Int64 pTotalBytes
		);

		/// <summary>
		/// Callback function used by SFileSetAddFileCallback.
		/// </summary>
		/// <param name="pvUserData">User data pointer that has been passed to SFileSetAddFileCallback.</param>
		/// <param name="dwBytesWritten"> Contains number of bytes that has already been written to the MPQ.</param>
		/// <param name="dwTotalBytes">Contains total number of bytes to be written to the MPQ. It is the size of the file being added.</param>
		/// <param name="bFinalCall">If this parameter is true, it means that the operation is complete and succeeded. It also means that this is the last call to the callback function.</param>
		public delegate void SFILE_ADDFILE_CALLBACK(
			IntPtr pvUserData,
			uint dwBytesWritten,
			uint dwTotalBytes,
			bool bFinalCall
		);

		public struct SFILE_FIND_DATA
		{
			/// <summary>
			/// Name of the found file
			/// </summary>
			string cFileName;
			/// <summary>
			/// Plain name of the found file
			/// </summary>
			public string szPlainName;
			/// <summary>
			/// Hash table index for the file
			/// </summary>
			public uint dwHashIndex;
			/// <summary>
			/// Block table index for the file
			/// </summary>
			public uint dwBlockIndex;
			/// <summary>
			/// Uncompressed size of the file, in bytes
			/// </summary>
			public uint dwFileSize;
			/// <summary>
			/// MPQ file flags
			/// </summary>
			public uint dwFileFlags;
			/// <summary>
			/// Compressed file size
			/// </summary>
			public uint dwCompSize;
			/// <summary>
			/// Low 32-bits of the file time (0 if not present)
			/// </summary>
			public uint dwFileTimeLo;
			/// <summary>
			/// High 32-bits of the file time (0 if not present)
			/// </summary>
			public uint dwFileTimeHi;
			/// <summary>
			/// Locale version
			/// </summary>
			public uint lcLocale;
		};

	}
}

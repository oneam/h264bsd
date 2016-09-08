// h264bsdTest.cpp : Defines the entry point for the console application.
//

#include <SDKDDKVer.h>
#include <stdio.h>
#include <tchar.h>
#include <Windows.h>

extern "C"
{
#include "h264bsd_decoder.h"
}


int _tmain(int argc, _TCHAR* argv[])
{
    storage_t *decoder = NULL;
    char filename[1024];
    sprintf_s(filename, 1024, "%S", argv[1]);
    FILE *input;
    fopen_s(&input, filename, "rb");

    fseek(input, 0L, SEEK_END);
    long fileSize = ftell(input);

    u8 *fileData = (u8*)malloc(fileSize);
    if(fileData == NULL) return 1;

    LARGE_INTEGER frequency_li;
    QueryPerformanceFrequency(&frequency_li);
    double frequency = (double)(frequency_li.QuadPart);

    while(true) {
        fseek(input, 0L, SEEK_SET);
        size_t inputRead = fread(fileData, sizeof(u8), fileSize, input);

        LARGE_INTEGER start;
        QueryPerformanceCounter(&start);

        double numFrames = 0;
        u8* byteStrm = fileData;
        u32 len = fileSize;
        u32 bytesRead = 0;
        u32 status = H264BSD_RDY;

        decoder = h264bsdAlloc();
        status = h264bsdInit(decoder, 0);
        if(status > 0) return 2;
        
        while(len > 0) {
            status = h264bsdDecode(decoder, byteStrm, len, 0, &bytesRead);

            if(status == H264BSD_PIC_RDY) {
                ++numFrames;
                u32 picId, isIdrPic, numErrMbs;
                u8* picData = h264bsdNextOutputPicture(decoder, &picId, &isIdrPic, &numErrMbs);
            }

            if(status == H264BSD_ERROR) {
                printf("General Error with %i bytes left\n", len);
            }

            if(status == H264BSD_PARAM_SET_ERROR) {
                printf("Param Set Error with %i bytes left\n", len);
            }

            if(status == H264BSD_MEMALLOC_ERROR) {
                printf("Malloc Error with %i bytes left\n", len);
            }

            byteStrm += bytesRead;
            len-= bytesRead;
            status = H264BSD_RDY;
        }

        h264bsdShutdown(decoder);
        h264bsdFree(decoder);

        LARGE_INTEGER end;
        QueryPerformanceCounter(&end);

        double decodeTime = (double)(end.QuadPart - start.QuadPart) / frequency;

        printf("Decoded %.0f frames in %f seconds (%f fps or %f ms per frame)\n", numFrames, decodeTime, numFrames / decodeTime, decodeTime / numFrames * 1000.0);
    }

	return 0;
}


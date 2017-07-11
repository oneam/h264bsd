/* Small application used to test teh h264bsd library on a posix compatible syste */

#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <time.h>
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>

#include "../src/h264bsd_decoder.h"
#include "../src/h264bsd_util.h"

static char* outputDir = NULL;
static int repeatTest = 0;

void createContentBuffer(char* contentPath, u8** pContentBuffer, size_t* pContentSize) {
  struct stat sb;
  if (stat(contentPath, &sb) == -1) {
    perror("stat failed");
    exit(1);
  }

  *pContentSize = sb.st_size;
  *pContentBuffer = (u8*)malloc(*pContentSize);
}

void loadContent(char* contentPath, u8* contentBuffer, size_t contentSize) {
  FILE *input = fopen(contentPath, "r");
  if (input == NULL) {
    perror("open failed");
    exit(1);
  }

  off_t offset = 0;
  while(offset < contentSize) {
    offset += fread(contentBuffer + offset, sizeof(u8), contentSize - offset, input);
  }

  fclose(input);
}

void saveImage(int picNum, u8* picData, int width, int height) {
  if(!outputDir) return;

  char outputPath[128];
  sprintf(outputPath, "%s/frame_%02d.yuv", outputDir, picNum);

  FILE *output = fopen(outputPath, "w");
  if (output == NULL) {
    perror("open failed");
    exit(1);
  }

  size_t picSize = width * height * 3 / 2;
  off_t offset = 0;
  while(offset < picSize) {
    offset += fwrite(picData + offset, sizeof(u8), picSize - offset, output);
  }

  fclose(output);
}

void decodeContent(u8* contentBuffer, size_t contentSize) {
  u32 status;
  storage_t dec;
  status = h264bsdInit(&dec, HANTRO_FALSE);

  if(status != HANTRO_OK) {
    fprintf(stderr, "h264bsdInit failed\n");
    exit(1);
  }

  u8* byteStrm = contentBuffer;
  u32 readBytes;
  u32 len = contentSize;
  int numPics = 0;
  u8* pic;
  u32 picId, isIdrPic, numErrMbs;
  u32 top, left, width, height, croppingFlag;

  while(len > 0) {
    u32 result = h264bsdDecode(&dec, byteStrm, len, 0, &readBytes);
    len -= readBytes;
    byteStrm += readBytes;

    switch(result) {
      case H264BSD_PIC_RDY:
        pic = h264bsdNextOutputPicture(&dec, &picId, &isIdrPic, &numErrMbs);
        ++numPics;
        saveImage(numPics, pic, width, height);
        break;
      case H264BSD_HDRS_RDY:
        h264bsdCroppingParams(&dec, &croppingFlag, &left, &width, &top, &height);
        if(!croppingFlag) {
          width = h264bsdPicWidth(&dec) * 16;
          height = h264bsdPicHeight(&dec) * 16;
        }

        char* cropped = croppingFlag ? "(cropped) " : "";
        printf("Decoded headers. Image size %s%dx%d.\n", cropped, width, height);
        break;
      case H264BSD_RDY:
        break;
      case H264BSD_ERROR:
        printf("Error\n");
        exit(1);
      case H264BSD_PARAM_SET_ERROR:
        printf("Param set error\n");
        exit(1);
    }
  }

  printf("Test file complete. %d pictures decoded.\n", numPics);
  h264bsdShutdown(&dec);
}

int main(int argc, char *argv[]) {
  int c = getopt (argc, argv, "ro:");
  while (c != -1) {
    switch (c) {
      case 'o':
        outputDir = optarg;
        break;
      case 'r':
        repeatTest = 1;
        break;
      default:
        abort ();
    }
    c = getopt (argc, argv, "o");
  }

  if (argc < 2) {
    fprintf(stderr, "Usage: %s -r [-o <outputDir>] <test_video.h264>\n", argv[0]);
    exit(1);
  }

  char *contentPath = argv[argc - 1];
  u8* contentBuffer;
  size_t contentSize;
  createContentBuffer(contentPath, &contentBuffer, &contentSize);

  if (repeatTest) {
    while(1) {
      loadContent(contentPath, contentBuffer, contentSize);
      decodeContent(contentBuffer, contentSize);
    }
  } else {
    loadContent(contentPath, contentBuffer, contentSize);
    decodeContent(contentBuffer, contentSize);
  }
}
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
static char* compareDir = NULL;
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
  while (offset < contentSize) {
    offset += fread(contentBuffer + offset, sizeof(u8), contentSize - offset, input);
  }

  fclose(input);
}

void saveImage(u8* picData, int width, int height, int picNum) {
  char picPath[128];
  sprintf(picPath, "%s/frame_%02d.yuv", outputDir, picNum);

  FILE *output = fopen(picPath, "w");
  if (output == NULL) {
    perror("open failed");
    exit(1);
  }

  size_t picSize = width * height * 3 / 2;
  off_t offset = 0;
  while (offset < picSize) {
    offset += fwrite(picData + offset, sizeof(u8), picSize - offset, output);
  }

  fclose(output);
}

static u8* expectedData = NULL;
static int totalErrors = 0;

int compareImage(u8* actualData, int width, int height, int picNum) {
  char expectedPath[128];
  sprintf(expectedPath, "%s/frame_%02d.yuv", compareDir, picNum);

  FILE *input = fopen(expectedPath, "r");
  if (input == NULL) {
    perror("open failed");
    exit(1);
  }

  size_t picSize = width * height * 3 / 2;
  size_t uDataOffset = width * height;
  size_t vDataOffset = width * height * 5 / 4;

  if (!expectedData) expectedData = (u8*)malloc(picSize);

  off_t offset = 0;
  while (offset < picSize) {
    offset += fread(expectedData + offset, sizeof(u8), picSize - offset, input);
  }

  fclose(input);

  int numErrors = 0;

  size_t yOffset = 0;
  size_t uvOffset = 0;

  u8* yExpected = expectedData;
  u8* uExpected = expectedData + uDataOffset;
  u8* vExpected = expectedData + vDataOffset;

  u8* yActual = actualData;
  u8* uActual = actualData + uDataOffset;
  u8* vActual = actualData + vDataOffset;

  for (int y=0; y<height; ++y) {
    for (int x=0; x<width; ++x) {
      int ySame = yActual[yOffset] == yExpected[yOffset];
      int uSame = uActual[uvOffset] == uExpected[uvOffset];
      int vSame = vActual[uvOffset] == vExpected[uvOffset];

      if(!ySame || !uSame || !vSame) {
        ++numErrors;
        if (numErrors <= 5) {
          printf(
            "Pixel (%d,%d) is different. Expected (%d,%d,%d) but saw (%d,%d,%d).\n",
            x, y,
            yExpected[yOffset], uExpected[uvOffset], vExpected[uvOffset],
            yActual[yOffset], uActual[uvOffset], vActual[uvOffset]);
        }

        if (numErrors == 6) printf("...\n");
      }

      ++yOffset;
      if(yOffset % 1) ++ uvOffset;
    }
  }

  if(numErrors > 0) printf("%d pixels are different on frame %d.\n\n", numErrors, picNum);
  return numErrors;
}

void decodeContent (u8* contentBuffer, size_t contentSize) {
  u32 status;
  storage_t dec;
  status = h264bsdInit(&dec, HANTRO_FALSE);

  if (status != HANTRO_OK) {
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
  int totalErrors = 0;

  while (len > 0) {
    u32 result = h264bsdDecode(&dec, byteStrm, len, 0, &readBytes);
    len -= readBytes;
    byteStrm += readBytes;

    switch (result) {
      case H264BSD_PIC_RDY:
        pic = h264bsdNextOutputPicture(&dec, &picId, &isIdrPic, &numErrMbs);
        ++numPics;
        if (outputDir) saveImage(pic, width, height, numPics);
        if (compareDir) totalErrors += compareImage(pic, width, height, numPics);
        break;
      case H264BSD_HDRS_RDY:
        h264bsdCroppingParams(&dec, &croppingFlag, &left, &width, &top, &height);
        if (!croppingFlag) {
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

  h264bsdShutdown(&dec);

  printf("Test file complete. %d pictures decoded.\n", numPics);
  if (compareDir) printf("%d errors found.\n", totalErrors);
}

int main(int argc, char *argv[]) {
  int c;
  while ((c = getopt (argc, argv, "ro:c:")) != -1) {
    switch (c) {
      case 'o':
        outputDir = optarg;
        break;
      case 'c':
        compareDir = optarg;
        break;
      case 'r':
        repeatTest = 1;
        break;
      default:
        abort();
    }
  }

  if (argc < 2) {
    fprintf(stderr, "Usage: %s [-r] [-c <actualDir>] [-o <outputDir>] <test_video.h264>\n", argv[0]);
    exit(1);
  }

  char *contentPath = argv[argc - 1];
  u8* contentBuffer;
  size_t contentSize;
  createContentBuffer(contentPath, &contentBuffer, &contentSize);

  if (repeatTest) {
    while (1) {
      loadContent(contentPath, contentBuffer, contentSize);
      decodeContent(contentBuffer, contentSize);
    }
  } else {
    loadContent(contentPath, contentBuffer, contentSize);
    decodeContent(contentBuffer, contentSize);
  }
}
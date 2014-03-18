SOURCES = $(wildcard ../src/*.c) main.c

FLASCC:=X
FLEX:=X
BASE_CFLAGS:=-DFLASCC -O4 -I $(FLASCC)/usr/include

check:
	@if [ -d $(FLASCC)/usr/bin ] ; then true ; \
	else echo "Couldn't locate FLASCC sdk directory, please invoke make with \"make FLASCC=/path/to/FLASCC/sdk ...\"" ; exit 1 ; \
	fi

	@if [ -d "$(FLEX)/bin" ] ; then true ; \
	else echo "Couldn't locate Flex sdk directory, please invoke make with \"make FLEX=/path/to/flex  ...\"" ; exit 1 ; \
	fi

swc: check
	"$(FLASCC)/usr/bin/gcc" $(BASE_CFLAGS) $(SOURCES) -emit-swc=h264bsd_asm -o lib/h264bsd_asm.swc
	"$(FLEX)/bin/mxmlc" -static-link-runtime-shared-libraries -compiler.omit-trace-statements=false -library-path=lib/h264bsd_asm.swc -debug=true test/h264test.as -o test/h264test.swf


clean:
	rm -f *.swf *.swc *.bc *.exe

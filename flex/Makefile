SOURCES = $(wildcard ../src/*.c) main.c
AS_SOURCES = $(wildcard src/h264bsd/*.as)

FLASCC:=X
FLEX:=X
BASE_CFLAGS:=-DFLASCC -O4 -I $(FLASCC)/usr/include

swc: bin/h264bsd.swc

test: test/h264test.swf

lib/h264bsd_asm.swc: $(SOURCES)
	@if [ -d $(FLASCC)/usr/bin ] ; then true ; \
	else echo "Couldn't locate FLASCC sdk directory, please invoke make with \"make FLASCC=/path/to/FLASCC/sdk ...\"" ; exit 1 ; \
	fi

	mkdir -p lib
	"$(FLASCC)/usr/bin/gcc" $(BASE_CFLAGS) $(SOURCES) -emit-swc=h264bsd_asm -o lib/h264bsd_asm.swc

bin/h264bsd.swc: lib/h264bsd_asm.swc $(AS_SOURCES)
	@if [ -d "$(FLEX)/bin" ] ; then true ; \
	else echo "Couldn't locate Flex sdk directory, please invoke make with \"make FLEX=/path/to/flex  ...\"" ; exit 1 ; \
	fi

	mkdir -p bin
	"$(FLEX)/bin/compc" -library-path=lib/h264bsd_asm.swc -source-path=src -include-sources=src -o bin/h264bsd.swc

test/h264test.swf: test/h264test.mxml bin/h264bsd.swc
	@if [ -d "$(FLEX)/bin" ] ; then true ; \
	else echo "Couldn't locate Flex sdk directory, please invoke make with \"make FLEX=/path/to/flex  ...\"" ; exit 1 ; \
	fi

	"$(FLEX)/bin/mxmlc" -static-link-runtime-shared-libraries -compiler.omit-trace-statements=false -library-path=bin/h264bsd.swc -debug=true test/h264test.mxml -o test/h264test.swf

clean:
	rm -f test/*.swf lib/*.swc bin/*.swc *.bc *.exe

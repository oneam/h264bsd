module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    //Doesn't seem to work atm.  Clobbers global vars needed in test script.
    uglify: {
      minlibs: {
        options: {
            mangle: false,
        },
        files: {
          'dist/h264bsd.min.js': ['h264bsd_asm.js',' sylvester.js', 'glUtils.js', 'util.js', 'canvas.js', 'h264bsd.js']
        }
      }
    },   

    concat: {
      pack: {
        src: ['h264bsd_asm.js',' sylvester.js', 'glUtils.js', 'util.js', 'canvas.js', 'h264bsd.js'],
        dest: 'dist/h264bsd.min.js'
      }
    },
   
    //grunt-clean
    clean: {
      dist: 'dist/',
      options: {
        force:true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
    

  // Default task.
  grunt.registerTask('default', ['clean', 'concat']);
};

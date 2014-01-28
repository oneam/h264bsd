module.exports = function(grunt) {
  grunt.initConfig({

    uglify: {
      options: {
            mangle: false
      },      
      minlibs: {
        files: {
          'dist/h264bsd.min.js': ['h264bsd_asm.js',' sylvester.js', 'glUtils.js', 'util.js', 'canvas.js', 'h264bsd.js']
        }
      }
    },   

    concat: {
      libs: {
        src:  ['h264bsd_asm.js',' sylvester.js', 'glUtils.js', 'util.js', 'canvas.js', 'h264bsd.js'],
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
  grunt.registerTask('default', ['clean', 'uglify']);
};

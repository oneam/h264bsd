task :js do
    Dir.chdir("js") do
        sh "rake"
    end
end

task :wasm do
    Dir.chdir("wasm") do
        sh "rake"
    end
end

task :posix do
    Dir.chdir("posix") do
        sh "rake"
    end
end

task :ci_build_js do
    Dir.chdir("js") do
        sh "rake clean build compress test"
    end
end

task :ci_build_wasm do
    Dir.chdir("wasm") do
        sh "rake clean build compress test"
    end
end

task :ci_build_posix do
    Dir.chdir("posix") do
        sh "rake clean static_lib test"
    end
end

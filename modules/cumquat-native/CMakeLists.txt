cmake_minimum_required(VERSION 3.22)
project(cumquat_native_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(cumquat_core STATIC
  cpp/core/Engine.cpp
  cpp/geo/Geodesy.cpp
  cpp/projection/Projection.cpp
)

target_include_directories(cumquat_core PUBLIC cpp)

target_compile_options(cumquat_core PRIVATE
  $<$<CXX_COMPILER_ID:Clang,GNU>:-Wall -Wextra -Wpedantic>
)

option(CUMQUAT_BUILD_TESTS "Build Cumquat native tests" ON)

if(CUMQUAT_BUILD_TESTS)
  enable_testing()
  add_executable(cumquat_core_tests tests/core_test.cpp)
  target_link_libraries(cumquat_core_tests PRIVATE cumquat_core)
  add_test(NAME cumquat_core_tests COMMAND cumquat_core_tests)
endif()

cmake_minimum_required(VERSION 3.16)
project(webcash-sdk VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)

# Find the native library
find_library(WEBCASH_LIB webcash_sdk PATHS ${CMAKE_CURRENT_SOURCE_DIR}/../native/target/release)

add_library(webcash_sdk INTERFACE)
target_include_directories(webcash_sdk INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}/../include
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

if(WEBCASH_LIB)
    target_link_libraries(webcash_sdk INTERFACE ${WEBCASH_LIB})
endif()

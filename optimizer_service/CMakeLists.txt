# CMakeList.txt : CMake project for optimizer_service, include source and define
# project specific logic here.
#
cmake_minimum_required (VERSION 3.10)
cmake_policy(VERSION 3.20)

project(optimizer_service LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# nlohmann_json (header-only)
include(FetchContent)
FetchContent_Declare(
  nlohmann_json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3
)
FetchContent_MakeAvailable(nlohmann_json)

# hiredis (dependency for redis-plus-plus)
FetchContent_Declare(
  hiredis
  GIT_REPOSITORY https://github.com/redis/hiredis.git
  GIT_TAG master
)

set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(ENABLE_EXAMPLES OFF CACHE BOOL "" FORCE)
set(DISABLE_TESTS ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(hiredis)

# kopiowanie nagłówków hiredis do include/hiredis w buildzie
file(MAKE_DIRECTORY "${hiredis_BINARY_DIR}/include/hiredis")
file(GLOB HIREDIS_HEADERS "${hiredis_SOURCE_DIR}/*.h")
file(COPY ${HIREDIS_HEADERS} DESTINATION "${hiredis_BINARY_DIR}/include/hiredis")
set(HIREDIS_INCLUDE_DIR "${hiredis_BINARY_DIR}/include")
include_directories(${hiredis_BINARY_DIR}/include)
set(HIREDIS_ROOT "${hiredis_SOURCE_DIR}")
set(HIREDIS_HEADER "${hiredis_BINARY_DIR}/include")
set(HIREDIS_LIB "${hiredis_BINARY_DIR}")

# redis-plus-plus
set(REDIS_PLUS_PLUS_BUILD_TEST OFF CACHE BOOL "" FORCE)
set(REDIS_PLUS_PLUS_BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(REDIS_PLUS_PLUS_BUILD_STATIC ON CACHE BOOL "" FORCE)
FetchContent_Declare(
  redis-plus-plus
  GIT_REPOSITORY https://github.com/sewenew/redis-plus-plus.git
  GIT_TAG 1.3.11
)
FetchContent_MakeAvailable(redis-plus-plus)

include_directories(include)

# Explicitly list sources to ensure all are included
set(SOURCES
    src/main.cpp
    src/event/EventReceiver.cpp
    src/event/EventSender.cpp
    src/model/Individual.cpp
    src/model/ProblemData.cpp
    src/model/EventModels.cpp
    src/optimization/Evaluator.cpp
    src/optimization/ExampleGeneticAlgorithm.cpp
    src/optimization/ZawodevGeneticAlgorithm.cpp
    src/utils/JsonParser.cpp
    src/utils/Logger.cpp
    src/utils/TestCaseGenerator.cpp
)

add_executable(optimizer_service ${SOURCES})

target_include_directories(optimizer_service PRIVATE include)
target_include_directories(optimizer_service PRIVATE ${redis-plus-plus_SOURCE_DIR}/src)
target_include_directories(optimizer_service PRIVATE ${redis-plus-plus_SOURCE_DIR}/src/sw/redis++/cxx17)
target_include_directories(optimizer_service PRIVATE ${redis-plus-plus_SOURCE_DIR}/src/sw/redis++/no_tls)

target_link_libraries(optimizer_service PRIVATE nlohmann_json::nlohmann_json)
target_link_libraries(optimizer_service PRIVATE hiredis)
target_link_libraries(optimizer_service PRIVATE redis++::redis++_static)

# windows socket library for redis connections
if(WIN32)
    target_link_libraries(optimizer_service PRIVATE ws2_32)
endif()

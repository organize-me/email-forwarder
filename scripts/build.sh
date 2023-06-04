#!/bin/bash

rm -rf ./build

# compile typescript
npx tsc

# copy over js to install dir
mkdir -p ./build/install
cp -a ./build/js/main/* ./build/install

# copy config to install dir
mkdir -p ./build/install/config
cp ./config/* ./build/install/config/

# install dependecies
cp ./package.json ./build/install/package.json
cp ./package-lock.json ./build/install/package-lock.json
npm --omit=dev --prefix ./build/install install

# remove package files
rm ./build/install/package.json
rm ./build/install/package-lock.json

# acrive
pushd ./build/install
zip -r email-forwarder.zip .*
popd
mv ./build/install/email-forwarder.zip ./build/email-forwarder.zip
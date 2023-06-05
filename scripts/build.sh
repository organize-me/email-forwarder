#!/bin/bash

rm -rf ./build || exit 1

# compile typescript
npx tsc || exit 1

# copy over js to install dir
mkdir -p ./build/install || exit 1
cp -a ./build/js/main/* ./build/install || exit 1

# copy config to install dir
mkdir -p ./build/install/config || exit 1
cp ./config/* ./build/install/config/ || exit 1

# install dependecies
cp ./package.json ./build/install/package.json || exit 1
cp ./package-lock.json ./build/install/package-lock.json || exit 1
npm --omit=dev --prefix ./build/install install || exit 1

# remove package files
rm ./build/install/package.json || exit 1
rm ./build/install/package-lock.json || exit 1

# acrive
pushd ./build/install || exit 1
zip -r email-forwarder.zip .* || exit 1
popd || exit 1
mv ./build/install/email-forwarder.zip ./build/email-forwarder.zip || exit 1
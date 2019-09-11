echo "Starting build script for $1 extension...";

if [ ! -d "$1" ]; then
  echo "The extension $1 does not exist! The script will be terminated.";
  exit;
fi

rm -rf 'build/'$1
rm -f 'build/'$1'.zip'

if [ ! -d "build" ]; then
	mkdir 'build'
fi

cp -r $1 'build/'$1'/'

zip -r 'build/'$1'.zip' 'build/'$1'/'
rm -rf 'build/'$1

echo "$1 build proccess has been finished";

@default:
    just --list --justfile {{source_file()}}

install:
    npm install

dev:
    npm run dev

build:
    npm run build

lint:
    npm run lint

clean:
    rm -rf .next/ out/ node_modules/

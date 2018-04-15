#!/usr/bin/env bash

DOCKER=docker

if ! [ -x "$(command -v $DOCKER)" ]; then
  DOCKER=docker.exe # Maybe we're running under Windows 10 WSL
  if ! [ -x "$(command -v $DOCKER)" ]; then
    echo 'Error: docker is not installed.' >&2
    exit 1
  fi
fi

if ! [ -e Dockerfile ]; then
  echo 'Please run this command from the root of the project folder';
  echo 'eg. scripts/deploy_docker.sh'
  exit 1
fi

if ! [ -e config/config.json ]; then
  echo 'Please create a config/config.json file.';
  echo 'An example is included (config.json.example)';
  exit 1
fi


IMAGE_NAME=sonosbot
CONTAINER_NAME=sonosbot

$DOCKER build -t "$IMAGE_NAME" .

[ "$($DOCKER ps -a | grep $CONTAINER_NAME)" ] && $DOCKER rm $CONTAINER_NAME -f
$DOCKER run --name $CONTAINER_NAME -d $IMAGE_NAME

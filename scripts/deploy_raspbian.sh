#!/usr/bin/env bash

if ! [ -e package.json ]; then
  echo 'Please run this command from the root of the project folder';
  echo 'eg. scripts/deploy_raspbian.sh'
  exit 1
fi

USER=$(whoami)
if ! [ $USER == "root" ]; then
  echo Please run this script as root.
  echo eg sudo scripts/deploy_raspbian.sh
  exit 1
fi

apt-get update

echo Adding Yarn source...
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

echo Adding Node.js source...
curl -sL https://deb.nodesource.com/setup_8.x | bash -

echo Installing Node.js and Yarn...
apt-get install -y nodejs yarn

echo Installing packages...
yarn --production

echo Copying app...
if [ ! -d /opt/sonosbot ]; then
mkdir /opt/sonosbot
fi
cp -a . /opt/sonosbot

echo Configuring user/group permissions...

groupadd sonosbot
useradd -g sonosbot sonosbot
chown -R sonosbot:sonosbot /opt/sonosbot

echo Configuring service...
cat <<'EOF' > /etc/systemd/system/sonosbot.service
[Unit]
Description=sonosbot

[Service]
User=sonosbot
Group=sonosbot
Environment=DEBUG=sonosbot:*
ExecStart=/usr/bin/node /opt/sonosbot/index.js
WorkingDirectory=/opt/sonosbot
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sonosbot

[Install]
WantedBy=multi-user.target
EOF

systemctl enable sonosbot.service

echo Starting service...
systemctl start sonosbot


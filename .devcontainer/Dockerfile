FROM node:18

RUN apt-get update && apt-get -yq install sudo vim zsh sed
RUN sed -i 's/(ALL:ALL) ALL/(ALL:ALL) NOPASSWD: ALL/g' /etc/sudoers
RUN usermod -aG sudo node

RUN echo 'sh -c "$(curl -fsSL 'https://raw.githubusercontent.com/Robin-w151/setup-scripts/main/shell-debian.sh')"' > /usr/local/bin/setup.sh && chmod +x /usr/local/bin/setup.sh

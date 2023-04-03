FROM node:18

RUN apt-get update && apt-get -yq install curl fzf git sudo vim
RUN sed -i 's/(ALL:ALL) ALL/(ALL:ALL) NOPASSWD: ALL/g' /etc/sudoers && usermod -aG sudo node

COPY zsh-in-docker.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/zsh-in-docker.sh && /usr/local/bin/zsh-in-docker.sh

USER 1000

RUN /usr/local/bin/zsh-in-docker.sh -x

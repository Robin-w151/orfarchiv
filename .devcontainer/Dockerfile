FROM node:22

# Install common dependencies
RUN apt-get update && apt-get -yq install ca-certificates curl fzf git gnupg sudo vim default-jdk build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && apt-get clean

# Grant node user admin priviledges
RUN sed -i 's/(ALL:ALL) ALL/(ALL:ALL) NOPASSWD: ALL/g' /etc/sudoers && usermod -aG sudo node

# Install docker
RUN install -m 0755 -d /etc/apt/keyrings
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
RUN chmod a+r /etc/apt/keyrings/docker.gpg

RUN echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

RUN apt-get update && apt-get -yq install docker-ce docker-ce-cli && apt-get clean
RUN usermod -aG docker node

# Install zsh
COPY zsh-in-docker.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/zsh-in-docker.sh && /usr/local/bin/zsh-in-docker.sh

USER 1000

# Install zsh for user
RUN /usr/local/bin/zsh-in-docker.sh -x

# Install deno
RUN curl -fsSL https://deno.land/install.sh | bash -s -- --yes

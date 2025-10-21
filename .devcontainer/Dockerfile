FROM node:22.20.0

# Install common dependencies
RUN apt-get update && apt-get -yq install \
  build-essential \
  ca-certificates \
  curl \
  default-jdk \
  fontconfig \
  fzf \
  git \
  gnupg \
  libcairo2-dev \
  libgif-dev \
  libjpeg-dev \
  libpango1.0-dev \
  librsvg2-dev \
  sudo \
  unzip \
  vim \
  wget \
  zsh \
  && apt-get clean

# Install Fira Code Nerd Font
RUN mkdir -p /usr/share/fonts/truetype/firacode && \
  cd /usr/share/fonts/truetype/firacode && \
  wget -O FiraCode.zip "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.1.1/FiraCode.zip" && \
  unzip FiraCode.zip && \
  rm FiraCode.zip && \
  fc-cache -fv

# Install starship
RUN curl -sS https://starship.rs/install.sh | sh -s -- --yes

# Grant node user admin priviledges
RUN sed -i 's/(ALL:ALL) ALL/(ALL:ALL) NOPASSWD: ALL/g' /etc/sudoers && usermod -aG sudo node

# Set zsh as default shell
RUN chsh -s /usr/bin/zsh node

# Switch to node user
USER 1000
SHELL ["/bin/zsh", "-c"]
WORKDIR /home/node

# Install prezto
RUN git clone --recursive https://github.com/sorin-ionescu/prezto.git ".zprezto"
RUN rm -f .zprezto/runcoms/README.md .zshrc
RUN for rcfile in .zprezto/runcoms/*(.); do ln -s "$rcfile" "/home/node/.${rcfile:t}"; done

# Install Aikido safe-chain
RUN sudo npm i -g @aikidosec/safe-chain
RUN safe-chain setup

# Configure starship
RUN mkdir -p .config && echo 'eval "$(starship init zsh)"' >> .zshrc

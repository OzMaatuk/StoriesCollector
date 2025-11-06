ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

# Upgrade npm
RUN npm install -g npm@latest

# Install essential system packages
RUN apk add --no-cache \
    git curl wget openssh-client openssl bash zsh vim nano \
    build-base python3 postgresql-client sudo

# Configure sudo for node user
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Install global npm tools (static, safe to cache)
RUN npm install -g typescript ts-node prisma npm-check-updates

# Setup zsh for node user with aliases
USER node
RUN sh -c "$(wget -O- https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended \
    && echo 'export PATH=$PATH:/workspace/node_modules/.bin' >> ~/.zshrc \
    && echo 'alias dev="npm run dev"' >> ~/.zshrc \
    && echo 'alias build="npm run build"' >> ~/.zshrc \
    && echo 'alias test="npm test"' >> ~/.zshrc \
    && echo 'alias studio="npx prisma studio"' >> ~/.zshrc

# Set default shell
ENV SHELL=/bin/zsh
WORKDIR /workspace
CMD ["sleep", "infinity"]

FROM localstack/localstack

# Copy your script into the image
COPY ./scripts/create-kms-encryption-key.sh /etc/localstack/init/ready.d/create-kms-encryption-key.sh

EXPOSE 4566

# Ensure it's executable
RUN chmod +x /etc/localstack/init/ready.d/create-kms-encryption-key.sh

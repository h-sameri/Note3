# Note3 - Decentralized & Safe Notes

Note3 is a web3 note-taking application that introduces a decentralized, permanent, and secure approach to note-taking.
With Note3, all notes encrypted with a wallet-base generated key and are stored
on [WeaveDB](https://github.com/weavedb/weavedb): a decentralized web3 database.

## Demo video

**Demo video is available at [youtu.be/Z2G8wKRqzjE](https://youtu.be/Z2G8wKRqzjE)**

## Installation

To install and run Note3 locally, follow the steps below:

1. Clone the repository from GitHub:
   ```
   git clone https://github.com/h-sameri/Note3.git
   ```
2. Navigate to the project directory:
   ```
   cd Note3
   ```
3. Install the dependencies using npm or pnpm or yarn:
   ```
   npm install
   ```

## Usage

Once you have installed Note3, you can run it locally by following these steps:

1. Start the local development server:
   ```
   npm run dev
   ```
2. Open your web browser and visit `http://localhost:3000` to access the application.

## Data Storage and Security

Note3 stores your notes in WeaveDB, a decentralized NoSQL database powered by Arweave. This ensures that your data
remains secure, permanent, and resistant to censorship. WeaveDB utilizes the decentralized nature of the Arweave
blockchain, providing an immutable and reliable storage solution for your notes.

To further enhance data security, Note3 encrypts and decrypts your notes using a user wallet-based private and public
key generated pair. This means that only you can access and decrypt your notes.

## Contributors

- [h-sameri](https://github.com/h-sameri)
- [Mehmaj](https://github.com/mehmaj)

## License

Note3 is released under the [MIT License](https://opensource.org/licenses/MIT). You are free to use, modify, and
distribute this software for any purpose. Refer to the [LICENSE](LICENSE) file for more information.

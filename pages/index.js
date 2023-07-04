import {useEffect, useState, Fragment, React} from "react"
import WeaveDB from "weavedb-sdk"
import {ethers} from "ethers"
import lf from "localforage"
import {isNil} from "ramda"
import {Dialog, Menu, Transition} from '@headlessui/react'
import NoSsr from 'components/NoSSR'
import {
    ChartPieIcon,
    DocumentPlusIcon,
    Bars3Icon,
    XMarkIcon,
    CircleStackIcon,
} from '@heroicons/react/24/outline'
import ReactMde from "react-mde";
import * as Showdown from "showdown";
import "react-mde/lib/styles/css/react-mde-all.css";

const EthCrypto = require('eth-crypto');
const converter = new Showdown.Converter({
    tables: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
});


const navigation = [
    {name: 'New note', href: '#', icon: DocumentPlusIcon, current: false},
]
const notes2 = [
    {id: 1, name: 'Note Title', href: '#', initial: 'N', current: false},
    {id: 2, name: 'Another Note', href: '#', initial: 'N', current: false},
    {id: 3, name: 'Third Note', href: '#', initial: 'N', current: false},
]


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}


export default function Home() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const [selectedTab, setSelectedTab] = useState("write");
    // const contractTxId = "RMgzzKDCnm4vgLkuEhr7GIHcY7uIuxist7rsIjcEkBk"
    const contractTxId = "y_Q3d0TI67sBb3QfvC5uD7pH0Na_NLwLjtKsuqQueHY"
    const sonarLink = `https://sonar.warp.cc/?#/app/contract/${contractTxId}`
    const COLLECTION_NOTE = "note_dev"
    // State variables storing string values of title,note,createdDate|lastModifiedDate and doc ID.
    const [selectedNote, setSelectedNote] = useState("")
    const [selectedTitle, setSelectedTitle] = useState("")
    const [selectedId, setSelectedId] = useState("")
    const [selectedCreatedDate, setSelectedCreatedDate] = useState("")
    const [selectedLastModifiedDate, setSelectedLastModifiedDate] = useState("")
    // State variable storing an array of notes data
    const [notes, setNotes] = useState([])
    // State variable storing the weavedb-sdk object
    const [db, setDb] = useState(null)
    // State variable storing a boolean value indicating whether database initialization is complete.
    const [initDb, setInitDb] = useState(false)
    const [user, setUser] = useState(null)

    const checkUser = async () => {
        const wallet_address = await lf.getItem(`temp_address:current`)
        if (!isNil(wallet_address)) {
            const identity = await lf.getItem(`temp_address:${contractTxId}:${wallet_address}`)
            if (!isNil(identity)) {
                setUser({
                    wallet: wallet_address, privateKey: identity.privateKey, publicKey: identity.publicKey
                })
            }
        }
    }

    const setupWeaveDB = async () => {
        try {
            const _db = new WeaveDB({
                contractTxId: contractTxId
            })
            await _db.initializeWithoutWallet()
            setDb(_db)
            setInitDb(true)

        } catch (e) {
            console.error("setupWeaveDB", e)
        }
    }


    const login = async () => {
        const provider = new ethers.BrowserProvider(window.ethereum, "any")
        const signer = await provider.getSigner()
        await provider.send("eth_requestAccounts", [])
        const wallet_address = await signer.getAddress()
        let identity = await lf.getItem(`temp_address:${contractTxId}:${wallet_address}`)

        let tx
        let err
        if (isNil(identity)) {
            ;({tx, identity, err} = await db.createTempAddress(wallet_address))
            const linked = await db.getAddressLink(identity.address)
            if (isNil(linked)) {
                alert("something went wrong")
                return
            }
        } else {
            await lf.setItem("temp_address:current", wallet_address)

            setUser({
                wallet: wallet_address, privateKey: identity.privateKey, publicKey: identity.publicKey
            })
            return
        }
        if (!isNil(tx) && isNil(tx.err)) {
            identity.tx = tx
            identity.linked_address = wallet_address
            await lf.setItem("temp_address:current", wallet_address)
            await lf.setItem(`temp_address:${contractTxId}:${wallet_address}`, JSON.parse(JSON.stringify(identity)))
            setUser({
                wallet: wallet_address, privateKey: identity.privateKey, publicKey: identity.publicKey
            })
        }
    }

    const logout = async () => {
        await lf.removeItem("temp_address:current")
        setUser(null, "temp_current")
    }

    const handleLoginClick = async () => {
        try {
            await login()
        } catch (e) {
            console.error("handleLoginClick", e)
        }
    }

    const handleTitleChange = (event) => {
        setSelectedTitle(event.target.value);
    };
    const addClick = async () => {
        const encryptedNote = await EthCrypto.encryptWithPublicKey(
            user.publicKey, // encrypt with alice's publicKey
            selectedNote
        )
        const encryptedTitle = await EthCrypto.encryptWithPublicKey(
            user.publicKey, // encrypt with alice's publicKey
            selectedTitle
        )


        let currentDate = new Date()
        const noteStruct = {
            note: EthCrypto.cipher.stringify(encryptedNote),
            title: EthCrypto.cipher.stringify(encryptedTitle),
            user_address: db.signer(),
            createdDate: currentDate,
            lastModifiedDate: currentDate
        }

        try {
            await db.add(noteStruct, COLLECTION_NOTE, ...([user]))
            await fetchAllNodes()
        } catch (e) {
            console.error(e)
        }
    }

    const updateClick = async () => {
        const encryptedNote = await EthCrypto.encryptWithPublicKey(
            user.publicKey, // encrypt with alice's publicKey
            selectedNote
        )
        const encryptedTitle = await EthCrypto.encryptWithPublicKey(
            user.publicKey, // encrypt with alice's publicKey
            selectedTitle
        )
        const noteStruct = {
            note: EthCrypto.cipher.stringify(encryptedNote),
            title: EthCrypto.cipher.stringify(encryptedTitle),
            user_address: db.signer(),
            createdDate: selectedCreatedDate,
            lastModifiedDate: new Date()
        }
        try {
            await db.set(noteStruct, COLLECTION_NOTE, selectedId, ...([user]));
            await fetchAllNodes()
        } catch (e) {
            console.error(e)
        }
    }

    const fetchNote = async (note_id) => {

        try {
            let res = await getNoteById(note_id)
            setSelectedNote(res.data.note)
            setSelectedId(res.id)
            setSelectedTitle(res.data.title)
            setSelectedCreatedDate(res.data.createdDate)
            setSelectedLastModifiedDate(res.data.lastModifiedDate)
        } catch (e) {
            console.error(e)
        }
    }
    const deleteClick = async () => {
        try {
            await db.delete(COLLECTION_NOTE, selectedId, ...(user !== null ? [user] : []))
            await fetchAllNodes()
            wipeSelected()
        } catch (e) {
            console.error(e)
        }
    }

    async function decryptResult(res) {
        res.data.title = await EthCrypto.decryptWithPrivateKey(
            user.privateKey,
            res.data.title
        )
        res.data.note = await EthCrypto.decryptWithPrivateKey(
            user.privateKey,
            res.data.note
        )
        return res
    }

    function wipeSelected() {
        setSelectedTitle("")
        setSelectedNote("")
        setSelectedId(null)
        setSelectedCreatedDate(null)
        setSelectedLastModifiedDate(null)
    }

    function newNote() {
        wipeSelected()
    }

    // Function to retrieve all notes data from the database.
    const fetchAllNodes = async () => {
        try {
            // const res = await db.cget(COLLECTION_NOTE)
            if (user && user.wallet) {

                let res = await db.cget(COLLECTION_NOTE, ["user_address", "==", user.wallet.toLowerCase()], ["lastModifiedDate", "desc"]);
                for (let i = 0; i < res.length; i++) {
                    try {
                        res[i] = await decryptResult(res[i])
                        res['data']['current'] = false
                    } catch (Exception) {
                    }
                }


                setNotes(res)

            }
        } catch (e) {
            console.error(e)
        }
    }

    const getNoteById = async (note_id) => {
        try {
            if (user && user.wallet) {

                let res = await db.cget(COLLECTION_NOTE, note_id)

                try {
                    res = await decryptResult(res)
                    res['data']['current'] = false
                } catch (Exception) {
                }
                return res

            }
        } catch (e) {
            console.error(e)
        }
    }

    // Effect hook to initialize the database object on component mount.
    useEffect(() => {
        checkUser()
        setupWeaveDB()

    }, [])

    // Effect hook to retrieve notes data from the database on database initialization.
    useEffect(() => {
        if (initDb) {
            fetchAllNodes()
        }
    }, [initDb])


    return (
        <>
            <div>
                <Transition.Root show={sidebarOpen} as={Fragment}>
                    <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
                        <Transition.Child
                            as={Fragment}
                            enter="transition-opacity ease-linear duration-300"
                            enterFrom="opacity-0"
                            enterTo="opacity-100"
                            leave="transition-opacity ease-linear duration-300"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                        >
                            <div className="fixed inset-0 bg-gray-900/80"/>
                        </Transition.Child>

                        <div className="fixed inset-0 flex">
                            <Transition.Child
                                as={Fragment}
                                enter="transition ease-in-out duration-300 transform"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transition ease-in-out duration-300 transform"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                                    <Transition.Child
                                        as={Fragment}
                                        enter="ease-in-out duration-300"
                                        enterFrom="opacity-0"
                                        enterTo="opacity-100"
                                        leave="ease-in-out duration-300"
                                        leaveFrom="opacity-100"
                                        leaveTo="opacity-0"
                                    >
                                        <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                                            <button type="button" className="-m-2.5 p-2.5"
                                                    onClick={() => setSidebarOpen(false)}>
                                                <span className="sr-only">Close sidebar</span>
                                                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true"/>
                                            </button>
                                        </div>
                                    </Transition.Child>
                                    {/* Sidebar component, swap this element with another sidebar if you like */}

                                    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                                        <div className="flex h-24 shrink-0 items-center">

                                            <img className="h-16 w-auto shrink-0" src="./N.svg"></img>

                                        </div>
                                        <nav className="flex flex-1 flex-col">
                                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                                <li>
                                                    <ul role="list" className="-mx-2 space-y-1">
                                                        {navigation.map((item) => (
                                                            <li key={item.name}>
                                                                <button
                                                                    className={classNames(
                                                                        item.current
                                                                            ? 'bg-gray-50 text-indigo-600'
                                                                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                                    )}
                                                                    onClick={() => newNote()}
                                                                >
                                                                    <item.icon
                                                                        className={classNames(
                                                                            item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                                                                            'h-6 w-6 shrink-0'
                                                                        )}
                                                                        aria-hidden="true"
                                                                    />
                                                                    {item.name}
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li>
                                                <li>
                                                    <div className="text-xs font-semibold leading-6 text-gray-400">Your
                                                        teams
                                                    </div>
                                                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                                                        {notes2.map((note) => (
                                                            <li key={note.name}>
                                                                <a
                                                                    href={note.href}
                                                                    className={classNames(
                                                                        note.current
                                                                            ? 'bg-gray-50 text-indigo-600'
                                                                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                                    )}
                                                                >
                                  <span
                                      className={classNames(
                                          note.current
                                              ? 'text-indigo-600 border-indigo-600'
                                              : 'text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600',
                                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                                      )}
                                  >
                                    {note.initial}
                                  </span>
                                                                    <span className="truncate">{note.name}</span>
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li>
                                                <li className="mt-auto">
                                                    <span
                                                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                                                    >
                                                        <CircleStackIcon
                                                            className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600"
                                                            aria-hidden="true"
                                                        />
                                                        {initDb ? "WeaveDB is Ready" : "WeaveDB SDK is not initialized"}
                                                    </span>

                                                    <small><a href={sonarLink} target="_blank"
                                                              rel="noopener noreferrer">
                                                        Contract Transactions
                                                    </a></small>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>

                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </Dialog>
                </Transition.Root>

                {/* Static sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
                    {/* Sidebar component, swap this element with another sidebar if you like */}
                    <div
                        className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
                        <div className="flex h-24 shrink-0 items-center">

                            <img className="h-16 w-auto shrink-0" src="./N.svg"></img>

                        </div>


                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                <li>
                                    <ul role="list" className="-mx-2 space-y-1">
                                        {navigation.map((item) => (
                                            <li key={item.name}>
                                                <button
                                                    className={classNames(
                                                        item.current
                                                            ? 'bg-gray-50 text-indigo-600'
                                                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                    )}
                                                    onClick={() => newNote()}
                                                >
                                                    <item.icon
                                                        className={classNames(
                                                            item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                                                            'h-6 w-6 shrink-0'
                                                        )}
                                                        aria-hidden="true"
                                                    />
                                                    {item.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                                <li>
                                    <div className="text-xs font-semibold leading-6 text-gray-400">Notes</div>
                                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                                        {notes.map((note) => (
                                            <li key={note.data.title} onClick={() => fetchNote(note.id)}>
                                                <button
                                                    className={classNames(
                                                        note.data.current
                                                            ? 'bg-gray-50 text-indigo-600'
                                                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                                        'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                                    )}
                                                >
                          <span
                              className={classNames(
                                  note.data.current
                                      ? 'text-indigo-600 border-indigo-600'
                                      : 'text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600',
                                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                              )}
                          >
                            {note.data.title ? note.data.title[0] : ''}
                          </span>
                                                    <span className="truncate">{note.data.title}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                                <li className="mt-auto">

                                    <span
                                        className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                                    >
                                        <CircleStackIcon
                                            className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-indigo-600"
                                            aria-hidden="true"
                                        />
                                        {initDb ? "WeaveDB is Ready" : "WeaveDB SDK is not initialized"}
                                    </span>

                                    <small><a href={sonarLink} target="_blank"
                                              rel="noopener noreferrer">
                                        Contract Transactions
                                    </a></small>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                <div className="lg:pl-72">
                    <div className="sticky top-0 z-40 lg:mx-auto lg:max-w-7xl lg:px-8">
                        <div
                            className="flex h-16 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-0 lg:shadow-none">
                            <button
                                type="button"
                                className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <span className="sr-only">Open sidebar</span>
                                <Bars3Icon className="h-6 w-6" aria-hidden="true"/>
                            </button>

                            {/* Separator */}
                            <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true"/>

                            <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 items-center ">
                                <div className="relative flex flex-1">
                                    <span className="text-sm">Note3: Decentralized & Safe Notes</span>
                                </div>


                                <div className="flex items-center gap-x-4 lg:gap-x-6">
                                    {/* Profile dropdown */}
                                    <Menu as="div" className="relative">
                                        <Menu.Button className="-m-1.5 flex items-center p-1.5">
                                            <span className="sr-only">Open user menu</span>

                                            <span className="hidden lg:flex lg:items-center">
                        <div className="ml-4 text-sm font-semibold leading-6 text-gray-900" aria-hidden="true">

                            {!isNil(user) ? (<a onClick={logout}>
                                {user.wallet.slice(0, 5)}...{user.wallet.slice(-5)}
                            </a>) : (<a onClick={handleLoginClick}>Connect Wallet</a>)}

                        </div>
                      </span>
                                        </Menu.Button>

                                    </Menu>
                                </div>
                            </div>
                        </div>
                    </div>

                    <main className="py-10">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                            <div className="bg-white px-4 pb-5 ">
                                <label htmlFor="noteTitle" className="sr-only">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    name="noteTitle"
                                    id="noteTitle"
                                    className="block w-full border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                                    placeholder="Enter note title ..."
                                    value={selectedTitle}
                                    onChange={handleTitleChange}
                                />

                            </div>

                            <NoSsr>
                                <div className="px-4 pb-4">
                                    <ReactMde
                                        value={selectedNote}
                                        onChange={setSelectedNote}
                                        selectedTab={selectedTab}
                                        onTabChange={setSelectedTab}
                                        generateMarkdownPreview={markdown =>
                                            Promise.resolve(converter.makeHtml(markdown))
                                        }
                                    />
                                </div>
                            </NoSsr>
                            <div className="flex justify-between">
                                {selectedLastModifiedDate ? <div className="  bg-white px-6 pb-5 text-gray-400">
                                    <small>
                                        last-modified: {selectedLastModifiedDate}
                                    </small>

                                </div> : ""}

                                {selectedCreatedDate ? <div className=" bg-white px-6 pb-5 text-gray-400">
                                    <small>
                                        created: {selectedCreatedDate}
                                    </small>

                                </div> : ""}
                            </div>


                            <div
                                style={{
                                    display: "flex", flexDirection: "column", alignItems: "center",
                                }}
                            >


                                <div className=" w-full ">
                                    <div className=" flex justify-center px-4">
                                        {selectedId ?
                                            [

                                                <button
                                                    type="button"
                                                    className="mr-5 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                    onClick={() => updateClick()}
                                                >
                                                    SAVE
                                                </button>,
                                                <button
                                                    type="button"
                                                    className=" rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                    onClick={() => deleteClick()}
                                                >
                                                    DELETE
                                                </button>
                                            ] :
                                            <button
                                                type="button"
                                                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                onClick={() => addClick()}
                                            >
                                                CREATE
                                            </button>

                                        }

                                    </div>
                                </div>
                            </div>


                        </div>
                    </main>
                </div>
            </div>

        </>
    )
}

Moralis.initialize("HfgPHSx6h0n4MaM7Vzo4aKpXP73ffqMdEvsrOErJ");
Moralis.serverURL = "https://f6vrhqec4zqs.moralisweb3.com:2053/server";

const TOKEN_CONTRACT_ADDRESS = "0x662808778ca5732D53cf2F154cB2d21500006453";
const MARKETPLACE_CONTRACT_ADDRESS =
  "0xA34d4f666174Ad6a6E16dfE38582D2f80326039e";

init = async () => {
  hideElement(userInfo);
  hideElement(createItemForm);
  hideElement(userItemsSection);
  window.web3 = await Moralis.Web3.enable();
  window.tokenContract = new web3.eth.Contract(
    tokenContractAbi,
    TOKEN_CONTRACT_ADDRESS
  );
  window.marketplaceContract = new web3.eth.Contract(
    marketPlaceContractAbi,
    MARKETPLACE_CONTRACT_ADDRESS
  );
  initUser();
  loadItems();

  const soldItemsQuery = new Moralis.Query("SoldItems");
  const soldItemsSubscription = await soldItemsQuery.subscribe();
  soldItemsSubscription.on("create", onItemSold);

  const itemsAddedQuery = new Moralis.Query("ItemsForSale");
  const itemsAddedSubscription = await itemsAddedQuery.subscribe();
  itemsAddedSubscription.on("create", onItemAdded);
};

onItemSold = async (item) => {
  const listing = document.getElementById(`item-${item.attributes.uid}`);
  if (listing) {
    listing.parentNode.removeChild(listing);
  }

  user = await Moralis.User.current();
  if (user) {
    const params = { uid: `${item.attributes.uid}` };
    const soldItem = await Moralis.Cloud.run("getItem", params);
    if (soldItem) {
      if (user.get("accounts").includes(item.attributes.buyer)) {
        getAndRenderItemData(soldItem, renderUserItem);
      }

      const userItemListing = document.getElementById(
        `user-item-${item.tokenObjectId}`
      );
      if (userItemListing)
        userItemListing.parentNode.removeChild(userItemListing);
    }
  }
};

onItemAdded = async (item) => {

  const params = { uid: `${item.attributes.uid}` };
  const addedItem = await Moralis.Cloud.run("getItem", params);
  if (addedItem) {
    user = await Moralis.User.current();
    if (user) {
      if (user.get("accounts").includes(addedItem.ownerOf)) {
        const userItemListing = document.getElementById(
          `user-item-${item.tokenObjectId}`
        );
        if (userItemListing)
          userItemListing.parentNode.removeChild(userItemListing);

        getAndRenderItemData(addedItem, renderUserItem);
        return;
      }
    }
    getAndRenderItemData(addedItem, renderItem);
  }
};

initUser = async () => {
  if (await Moralis.User.current()) {
    hideElement(userConnectButton);
    showElement(userProfileButton);
    showElement(openCreateItemButton);
    showElement(openUserItemsButton);
    loadUserItems();
  } else {
    hideElement(userProfileButton);
    showElement(userConnectButton);
    hideElement(openCreateItemButton);
    hideElement(openUserItemsButton);
  }
};

login = async () => {
  try {
    await Moralis.Web3.authenticate();
    initUser();
  } catch (error) {
    alert(error);
  }
};
openUserInfo = async () => {
  user = await Moralis.User.current();
  if (user) {
    const email = user.get("email");
    if (email) {
      userEmailField.value = email;
    } else {
      userEmailField.value = "";
    }
    userUsernameField.value = user.get("username");
    const userAvatar = user.get("avatar");
    if (userAvatar) {
      userAvatarImg.src = userAvatar.url();
      showElement(userAvatarImg);
    } else {
      hideElement(userAvatarImg);
    }
    showElement(userInfo);
    $("#userInfo").modal("show");
  } else {
    login();
  }
};

openUserItems = async () => {
  user = await Moralis.User.current();
  if (user) {
    $("#userItems").modal("show");
  } else {
    login();
  }
};

loadUserItems = async () => {
  const ownedItems = await Moralis.Cloud.run("getUserItems");
  ownedItems.forEach((item) => {
    getAndRenderItemData(item, renderUserItem);
  });
};

loadItems = async () => {
  const items = await Moralis.Cloud.run("getItems");
  user = await Moralis.User.current();
  items.forEach((item) => {
    if (user) {
      if (user.attributes.accounts.includes(item.ownerOf)) {
        const userItemListing = document.getElementById(
          `user-item-${item.tokenObjectId}`
        );
        if (userItemListing)
          userItemListing.parentNode.removeChild(userItemListing);
        getAndRenderItemData(item, renderUserItem);
        return;
      }
    }
    getAndRenderItemData(item, renderItem);
  });
};

initTemplate = (id) => {
  const template = document.getElementById(id);
  template.id = "";
  template.parentNode.removeChild(template);
  return template;
};

renderUserItem = async (item) => {
  const userItemListing = document.getElementById(
    `user-item-${item.tokenObjectId}`
  );
  if (userItemListing) return;

  const userItem = userItemTemplate.cloneNode(true);
  userItem.getElementsByTagName("img")[0].src = item.image;
  userItem.getElementsByTagName("img")[0].alt = item.name;
  userItem.getElementsByTagName("h5")[0].innerText = item.name;
  userItem.getElementsByTagName("p")[0].innerText = item.desciption;

  userItem.getElementsByTagName("input")[0].value = item.askingPrice;
  userItem.getElementsByTagName("input")[0].disabled = item.askingPrice > 1;
  userItem.getElementsByTagName("button")[0].disabled = item.askingPrice > 1;
  userItem.getElementsByTagName("button")[0].onclick = async () => {
    user = await Moralis.User.current();
    if (!user) {
      login();
      return;
    }
    console.log(parseInt(item.tokenId),parseInt(userItem.getElementsByTagName("input")[0].value),item.tokenAddress)
    await ensureMarketplaceIsApproved(item.tokenId, item.tokenAddress);
    await marketplaceContract.methods
      .addItemToMarket(
        parseInt(item.tokenId),
        item.tokenAddress,
        parseInt(userItem.getElementsByTagName("input")[0].value)
      )
      .send({ from: user.get("ethAddress") });
  };

  userItem.id = `user-item-${item.tokenObjectId}`;
  userItems.appendChild(userItem);
};

renderItem = (item) => {
  const itemForSale = marketplaceItemTemplate.cloneNode(true);
  if (item.sellerAvatar) {
    itemForSale.getElementsByTagName("img")[0].src = item.sellerAvatar.url();
    itemForSale.getElementsByTagName("img")[0].alt = item.sellerUsername;
  }

  itemForSale.getElementsByTagName("img")[1].src = item.image;
  itemForSale.getElementsByTagName("img")[1].alt = item.name;
  itemForSale.getElementsByTagName("h5")[0].innerText = item.name;
  itemForSale.getElementsByTagName("p")[0].innerText = item.desciption;

  itemForSale.getElementsByTagName(
    "button"
  )[0].innerText = `Buy for ${item.askingPrice ?? 1}`;
  itemForSale.getElementsByTagName("button")[0].onclick = () => buyItem(item);
  itemForSale.id = `item-${item.uid}`;
  itemsForSale.appendChild(itemForSale);
};

getAndRenderItemData = (item, renderFunction) => {
  fetch(item.tokenUri)
    .then((response) => response.json())
    .then((data) => {
      item.name = data.name;
      item.desciption = data.desciption;
      item.image = data.image;
      item.askingPrice = data.price ? data.price: undefined;
      renderFunction(item);
    });
};

ensureMarketplaceIsApproved = async (tokenId, tokenAddress) => {
  user = await Moralis.User.current();
  const userAddress = user.get("ethAddress");
  const contract = new web3.eth.Contract(tokenContractAbi, tokenAddress);
  const approvedAddress = await contract.methods
    .getApproved(tokenId)
    .call({ from: userAddress });
  if (approvedAddress != MARKETPLACE_CONTRACT_ADDRESS) {
    await contract.methods
      .approve(MARKETPLACE_CONTRACT_ADDRESS, tokenId)
      .send({ from: userAddress });
  }
};

buyItem = async (item) => {
  user = await Moralis.User.current();
  if (!user) {
    login();
    return;
  }
  await marketplaceContract.methods
    .buyItem(item.uid)
    .send({ from: user.get("ethAddress"), value: item.askingPrice });
};

logout = async () => {
  await Moralis.User.logOut();
  hideElement(userInfo);
  initUser();
};

saveUserInfo = async () => {
  user.set("email", userEmailField.value);
  user.set("username", userUsernameField.value);
  if (userAvatarFile.files.length > 0) {
    const avatar = new Moralis.File("avatar.jpg", userAvatarFile.files[0]);
    user.set("avatar", avatar);
  }
  await user.save();
  alert("User Info upload Sucessfully!!!");
  openUserInfo();
};

createItem = async () => {
  if (createItemFile.files.length == 0) {
    alert("Please select a File1");
    return;
  } else if (createItemNameField.value.length == 0) {
    alert("Please give the Item a name!");
    return;
  }
  else if (createItemPriceField.value == "") {
    createItemPriceField.value = 1;
  }
  const nftFile = new Moralis.File("nftFile.jpg", createItemFile.files[0]);
  await nftFile.saveIPFS();

  const nftFilePath = nftFile.ipfs();
  const nftFileHash = nftFile.hash();

  const metadata = {
    name: createItemNameField.value,
    desciption: createItemDescriptionField.value,
    image: nftFilePath,
    price: createItemPriceField.value
  };
  
  const nftFileMetadataFile = new Moralis.File("metadata.json", {
    base64: btoa(JSON.stringify(metadata)),
  });
  await nftFileMetadataFile.saveIPFS();

  const nftFileMetadataFilePath = nftFileMetadataFile.ipfs();
  const nftFileMetadataFileHash = nftFileMetadataFile.hash();

  const nftId = await mintNft(nftFileMetadataFilePath);

  const Item = Moralis.Object.extend("Item");

  //create a new instance of the class
  const item = new Item();
  item.set("name", createItemNameField.value);
  item.set("description", createItemDescriptionField.value);
  item.set("nftFilePath", nftFilePath);
  item.set("nftFileHash", nftFileHash);
  item.set("metadataFilePath", nftFileMetadataFilePath);
  item.set("metadataFileHash", nftFileMetadataFileHash);
  item.set("nftId", nftId);
  item.set("nftContractAddress", TOKEN_CONTRACT_ADDRESS);
  await item.save();
  

  user = await Moralis.User.current();
  const userAddress = user.get("ethAddress");

  switch (createItemStatusField.value) {
    case "0":
      return;
    case "1":
      await ensureMarketplaceIsApproved(nftId, TOKEN_CONTRACT_ADDRESS);
      await marketplaceContract.methods
        .addItemToMarket(
          nftId,
          TOKEN_CONTRACT_ADDRESS,
          createItemPriceField.value
        )
        .send({ from: userAddress });
      break;
    case "2":
      alert("Not yet supported!");
      return;
  }
};

mintNft = async (metadatUrl) => {
  const reciept = await tokenContract.methods
    .createItem(metadatUrl)
    .send({ from: ethereum.selectedAddress });
  return reciept.events.Transfer.returnValues.tokenId;
};

hideElement = (element) => (element.style.display = "none");
showElement = (element) => (element.style.display = "block");

const userConnectButton = document.getElementById("btnConnect");
userConnectButton.onclick = login;
const userProfileButton = document.getElementById("btnUserInfo");
userProfileButton.onclick = openUserInfo;

// User Profile

const userInfo = document.getElementById("userInfo");
const userUsernameField = document.getElementById("txtUsername");
const userEmailField = document.getElementById("txtEmail");
const userAvatarImg = document.getElementById("imgAvatar");
const userAvatarFile = document.getElementById("fileAvatar");

document.getElementById("btnCloseUserInfo").onclick = () =>
  hideElement(userInfo);
document.getElementById("btnLogout").onclick = logout;

document.getElementById("btnSaveUserInfo").onclick = saveUserInfo;

// Create Item

const createItemForm = document.getElementById("createItem");
const createItemNameField = document.getElementById("txtCreateItemName");
const createItemDescriptionField = document.getElementById(
  "txtCreateItemDescription"
);
const createItemPriceField = document.getElementById("numberCreateItemPrice");
const createItemStatusField = document.getElementById("selectCreateItemStatus");
const createItemFile = document.getElementById("fileCreateItemFile");

const openCreateItemButton = document.getElementById("btnOpenCreateItem");
openCreateItemButton.onclick = () => $("#createItem").modal("show");
document.getElementById("btnCloseCreateItem").onclick = () =>
  hideElement(createItemForm);
document.getElementById("btnCreateItem").onclick = createItem;

// User Items
const userItemsSection = document.getElementById("userItems");
const userItems = document.getElementById("userItemsList");
document.getElementById("btnCloseUserItems").onclick = () =>
  hideElement(userItemsSection);
const openUserItemsButton = document.getElementById("btnMyItems");
openUserItemsButton.onclick = openUserItems;

const userItemTemplate = initTemplate("itemTemplate");
const marketplaceItemTemplate = initTemplate("marketplaceItemTemplate");

const itemsForSale = document.getElementById("itemsForSale");

init();

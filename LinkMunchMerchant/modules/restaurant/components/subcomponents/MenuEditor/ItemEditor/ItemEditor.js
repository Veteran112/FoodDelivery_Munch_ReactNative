import React, { useState, useEffect } from 'react';
import { Icon, Button, Input } from 'react-native-elements';
import {
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import ImagePicker from 'react-native-image-crop-picker';
import RNFetchBlob from 'rn-fetch-blob';
import { Auth } from 'aws-amplify';
import config from '../../../../config';
import Loading from 'react-native-loading-spinner-overlay';
import { decode } from 'base64-arraybuffer';
import AWS from 'aws-sdk';
import DropDownPicker from 'react-native-dropdown-picker';
import { Alert } from 'react-native';


const ItemEditor = ({ route, navigation }) => {
  const [item, setItem] = useState(
    route.params.item
      ? route.params.item
      : {
        picture: '',
        item_name: '',
        item_price: 0.00,
        item_description: '',
        item_type: '',
        available: true,
        item_ingredients: [],
      },
  );
  const [menuCategories, setMenuCategories] = useState(route.params.menuCategories);
  const [loading, setloading] = useState(false);
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (route.params.item) {
      route.params.item.item_price = route.params.item.item_price
      setItem(route.params.item);
    } else {
      setItem({
        picture: '',
        item_name: '',
        item_price: 0.00,
        item_description: '',
        item_type: '',
        available: true,
        item_ingredients: [],
      });
    }
  }, [route.params.item]);

  useEffect(() => {
    if (route.params.menuCategories) {
      setMenuCategories(route.params.menuCategories)
    }
  }, [route.params.menuCategories])

  const openpicker = () => {
    ImagePicker.openPicker({}).then(res => {
      setImage({
        uri: res.path,
        type: res.mime,
        name: res.filename,
      });
    });
  };

  const updateimage1 = (keyString, blob) => {
    return new Promise((resolve, reject) => {
      var s3 = new AWS.S3({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      });

      let body = decode(blob);

      s3.upload(
        {
          Bucket: config.bucket,
          Key: keyString,
          Body: body,
          ContentType: 'image/jpg',
          ACL: 'public-read',
        },
        (err, data) => {
          console.log(err);
          if (!err) {
            resolve(data.Location);
          } else {
            reject(err);
          }
        },
      );
    });
  };

  const submitResult = async () => {
    setloading(true);
    let info = await Auth.currentUserInfo();

    if (item.item_price.indexOf(".") != -1 && item.item_price.split(".")[1].length < 2) {
      item.item_price = item.item_price + "0"
    } else if (item.item_price.indexOf(".") === -1) {
      item.item_price = parseFloat(item.item_price).toFixed(2).toString()
    }

    let data = item;
    let updatedData = route.params.menuItems;
    try {
      try {
        if (image) {
          let blob = await RNFetchBlob.fs.readFile(image.uri, 'base64');

          let keyString =
            'restaurants/' +
            info.attributes.sub +
            '/menuPhotos/' +
            new Date().getTime() +
            '.jpg';

          let location = await updateimage1(keyString, blob);
          data = {
            ...item,
            picture: location,
          };
        }
      } catch (e) {
        console.log(e);
      }

      if (route.params.index != undefined) {
        updatedData[route.params.index] = data;
      } else {
        updatedData.push(data);
      }
      setItem(item)
      setloading(false);
      navigation.navigate('Menu', { updatedData, needsUpdate: true, menuCategories: menuCategories });
    } catch (e) {
      console.log(e);

      setloading(false);
    }
  };

  const deleteItem = async () => {
    setloading(true);
    let updatedData = route.params.menuItems;
    try {
      if (route.params.index != undefined) {
        updatedData.splice(route.params.index, 1);
      }
      setloading(false);
      navigation.navigate('Menu', { updatedData, needsUpdate: true });
    } catch (e) {
      console.log(e);
      setloading(false);
    }
  };

  // Dropdown states
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.item_type ? item.item_type : null);

  // Available checkbox states
  const [toggleCheckBox, setToggleCheckBox] = useState(item.available);

  // Ingredients states
  const [ingredients, setIngredients] = useState(item.item_ingredients ? item.item_ingredients : []);
  const [addIngredient, setAddIngredient] = useState('')

  // Handle adding ingredient to the list
  const addIngredientToList = () => {
    const newIngredientObject = {
      ingredient: addIngredient
    }

    setAddIngredient('');

    setIngredients([...ingredients, newIngredientObject]);
    const setItemIngredients = () => {
      setItem({ ...item, item_ingredients: [...ingredients, newIngredientObject] });
    }

    setItemIngredients();
  }

  // Handle removing ingredient from the list
  const removeIngredientFromList = (toRemove) => {
    const ingredientsArray = ingredients;
    const filterResult = ingredientsArray.filter(ingredient => ingredient.ingredient != toRemove.ingredient);
    setIngredients(filterResult);
    const setItemIngredients = () => {
      setItem({ ...item, item_ingredients: filterResult });
    }

    setItemIngredients();
  }

  // Rendering the ingredient list
  const renderIngredientList = ({ item }) => (
    <TouchableOpacity
      onPress={() => removeIngredientFromList(item)}
    >
      <View style={{
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 15,
      }}>
        <Icon
          name='x'
          type='feather'
          size={20}
          color='#D65344'
        />
        <Text style={{
          fontSize: 18,
          fontWeight: '400',
          marginLeft: 10
        }}>{item.ingredient}</Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={style.container}>
      <View style={{ marginBottom: 10, flex: 1 }}>
        <TouchableOpacity
          style={[style.photo, { marginBottom: 30 }]}
          onPress={() => openpicker()}>
          {item.picture || image ? (
            <Image
              source={{
                uri: image ? image.uri : item.picture + '?update=' + new Date(),
              }}
              style={style.photo}
            />
          ) : (
            <Icon name="photo" size={wp('15')} />
          )}
        </TouchableOpacity>
        <Input
          inputStyle={style.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Item Name"
          value={item.item_name}
          onChangeText={value => setItem({ ...item, item_name: value })}
        />
        <Input
          inputStyle={[style.input, { minHeight: 100 }]}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Description"
          numberOfLines={3}
          textAlignVertical="top"
          value={item.item_description}
          multiline={true}
          onChangeText={value => setItem({ ...item, item_description: value })}
        />
        <Input
          inputStyle={style.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Price"
          keyboardType="decimal-pad"
          leftIcon={<Icon name="attach-money" />}
          value={item.item_price}
          onChangeText={value => setItem({ ...item, item_price: value })}
        />
      </View>
      <DropDownPicker
        listMode="SCROLLVIEW"
        style={style.dropdown}
        open={open}
        value={value}
        items={menuCategories}
        setOpen={setOpen}
        setValue={setValue}
        onChangeValue={value => setItem({ ...item, item_type: value })}
        placeholder={'Item type'}
        placeholderStyle={{
          color: '#DED7D7'
        }}
        textStyle={{
          fontSize: 18,
          fontWeight: '400',
        }}
        searchable={true}
        searchPlaceholder="Search..."
        searchContainerStyle={{
          backgroundColor: "#F66B00",
          borderBottomColor: "white"
        }}
        searchTextInputStyle={{
          backgroundColor: "white",
          borderColor: "#F66B00"
        }}
      />
      <Button
        buttonStyle={[style.blueSmallButtonStyle, { marginBottom: 40 }]}
        title={`Update Menu Categories`}
        onPress={() => {
          navigation.navigate('CategoryEditor', {
            menuCategories: menuCategories
          })
        }}
      />
      <Button
        buttonStyle={[style.blueButtonStyle, { marginBottom: 10 }]}
        title={`Save`}
        onPress={submitResult}
      />
      <Button
        buttonStyle={[style.buttonStyle, { marginBottom: 30 }]}
        title={`Delete Item`}
        onPress={() => {
          Alert.alert(
            'Deleting Item',
            'Are you sure you want to delete this item?',
            [
              {
                text: 'Delete',
                onPress: (deleteItem)
              },
              { text: 'Cancel' },
            ],
          );
        }}
      />
      <Loading visible={loading} />
    </ScrollView>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
  },
  photo: {
    width: wp('30'),
    height: wp('30'),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    alignSelf: 'center',
    borderRadius: 15,
    borderColor: '#DDD',
    borderWidth: 1,
  },
  input: {
    backgroundColor: 'white',
    borderColor: '#DED7D7',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 11,
    paddingTop: 8,
    paddingBottom: 8,
  },
  dropdown: {
    marginBottom: 10,
    borderColor: '#DED7D7',
    borderWidth: 1,
    borderRadius: 8,
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5,
  },
  blueButtonStyle: {
    backgroundColor: '#F66B00',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5,
  },
  blueSmallButtonStyle: {
    backgroundColor: '#F66B00',
  },
  unavailable: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 35,
    alignItems: 'center',
  },
  ingredientsContainer: {
    display: 'flex',
  },
  addIngredients: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addIngredientsInput: {
    width: '75%',
    backgroundColor: 'white',
    borderColor: '#DED7D7',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 11,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 18,
    fontWeight: '400'
  }
});

export default ItemEditor;

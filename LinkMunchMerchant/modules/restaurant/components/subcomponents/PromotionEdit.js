import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Alert,
} from 'react-native';
import Loading from 'react-native-loading-spinner-overlay';
import { Input, Icon, Button, CheckBox } from 'react-native-elements';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import ImagePicker from 'react-native-image-crop-picker';
import { Auth } from 'aws-amplify';
import RNFetchBlob from 'rn-fetch-blob';
import AWS from 'aws-sdk';
import { decode } from 'base64-arraybuffer';
import config from '../../config';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PromotionEdit({ navigation, route }) {
  console.log(route.params.item)

  let now = Date.now()
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [priceChange, setPriceChange] = useState(false);
  const [promo, setPromo] = useState(
    route.params.item ??
    {
      promo_id: '',
      budget: '',
      max_uses: '',
      content_id: '',
      created_time: now,
      description: '',
      discount: '',
      end_time: now,
      order_id: [],
      start_time: now,
      title: '',
      total_purchased: 0,
      total_ref_created: 0,
      total_ref_used: 0,
      quantity: 0,
      stripe_id: '',
      product_id: '',
      si_id: ''
    });
  const [isOpen, setIsOpen] = useState(false);
  const [maxUseValue, setMaxUseValue] = useState(route.params.item ? parseInt(route.params.item.max_uses) : null);
  const [maxUseItems, setMaxUseItems] = useState([
    { label: 'Unlimited', value: 987654321 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 }
  ]);
  const [isEdit, setIsEdit] = useState(false);

  const [isSpecificItemsOpen, setSpecificItemsOpen] = useState(false);
  const [specificItemsValue, setSpecificItemsValue] = useState(promo.order_id);
  const [specificItemsItems, setSpecificItemsItems] = useState(route.params.menuItems)
  const restaurantEmail = route.params.restaurantEmail
  const restaurantPhone = route.params.restaurantPhone

  useEffect(() => {
    setIsEdit(route.params.needsupdate);
  }, [route.params.needsupdate]);

  useEffect(() => {
    if (route.params.item) {
      setPromo({
        ...route.params.item
      });
    }
    setImage(null);
  }, [route.params.item]);

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
          if (!err) {
            resolve(data.Location);
          } else {
            reject(err);
          }
        },
      );
    });
  };

  const updatepromotion = async () => {
    setLoading(true);
    let info = await Auth.currentUserInfo();
    let promodata = promo;
    let newVal = specificItemsValue.length > 0 ? specificItemsValue : promo.order_id
    setPromo({ ...promo, order_id: newVal })
    promo.order_id = newVal

    try {
      if (image) {
        let blob = await RNFetchBlob.fs.readFile(image.uri, 'base64');
        let keyString =
          'restaurants/' +
          info.attributes.sub +
          '/menuPhotos/' +
          new Date().getTime() +
          '.jpg';
        const location = await updateimage1(keyString, blob);
        promodata = { ...promo, content_id: location };
      }

      let body = {
        'restaurant-id': info.attributes.sub,
        'create': route.params.item ? 'False' : 'True',
        'newPromoInfo': promodata,
        'delete': 'False',
        'email': restaurantEmail,
        'phone': restaurantPhone ?? "",
        'priceChange': route.params.item ? (priceChange ? 'True' : 'False') : 'False',
      };

      const response = await fetch(
        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/updatepromotion',
        {
          method: 'POST', // *GET, POST, PUT, DELETE, etc.
          mode: 'cors', // no-cors, *cors, same-origin
          cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
          credentials: 'same-origin', // include, *same-origin, omit
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
          },
          redirect: 'follow', // manual, *follow, error
          referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: JSON.stringify(body), // body data type must match “Content-Type” header
        },
      );
      // console.log(response)
      let apiResponse = await response.json();
      console.log(apiResponse)
      let allPromos = route.params.allPromos;
      if (apiResponse.body != "updated") {
        promodata.promo_id = apiResponse.body.promo_id;
      }
      var index = allPromos.findIndex(obj => obj.promo_id == promodata.promo_id);

      setPromo(promodata)
      if (index == -1) {
        allPromos.push(promodata);
      } else {
        allPromos.splice(index, 1, promodata);
      }

      navigation.navigate({
        name: 'Promotion',
        params: { promotions: allPromos },
        merge: true,
      });
      setLoading(false);
      return apiResponse;
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  const openpicker = () => {
    ImagePicker.openPicker({}).then(res => {
      setImage({
        uri: res.path,
        type: res.mime,
        filename: res.path.split('/').pop(),
      });
    });
  };

  const removePromotion = () => {
    Alert.alert(
      'Delete Promotion',
      'Are you sure you want to delete this promotion?',
      [{ text: 'Ok', onPress: deletePromotion }, { text: 'Cancel' }],
    );
  };

  const deletePromotion = async () => {
    let info = await Auth.currentUserInfo();
    setLoading(true);

    let body = {
      'restaurant-id': info.attributes.sub,
      'create': route.params.item ? 'False' : 'True',
      'newPromoInfo': promo,
      'delete': 'True',
      'email': restaurantEmail,
      'phone': restaurantPhone ?? "",
      'priceChange': priceChange
    };
    const response = await fetch(
      'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/updatepromotion',
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(body), // body data type must match “Content-Type” header
      },
    );
    let apiResponse = await response.json();
    let allPromos = route.params.allPromos;
    var index = allPromos.findIndex(obj => obj.promo_id == promo.promo_id);
    allPromos.splice(index, 1);
    setLoading(false);
    navigation.navigate({
      name: 'Promotion',
      params: { promotions: allPromos },
      merge: true,
    });
    return apiResponse;
  };
  return (
    <ScrollView style={style.container}>
      <View style={{ marginBottom: 56 }}>
        <TouchableOpacity
          disabled={!isEdit}
          style={[style.photo, { marginBottom: 30 }]}
          onPress={() => openpicker()}>
          {promo.content_id || image ? (
            <Image
              source={{ uri: image ? image.uri : promo.content_id }}
              style={style.photo}
            />
          ) : (
            <Icon name="photo" size={wp('15')} />
          )}
        </TouchableOpacity>
        <Text>
          Title:
        </Text>
        <Input
          disabled={!isEdit}
          inputStyle={style.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Promotion Title"
          value={promo.title}
          onChangeText={value => setPromo({ ...promo, title: value })}
        />
        <Text>
          Description:
        </Text>
        <Input
          disabled={!isEdit}
          inputStyle={[style.input, { alignItems: 'baseline', minHeight: 100 }]}
          textAlignVertical="top"
          inputContainerStyle={{ borderBottomWidth: 0 }}
          numberOfLines={5}
          placeholder="Promotion Description"
          multiline={true}
          value={promo.description}
          onChangeText={value => setPromo({ ...promo, description: value })}
        />
        <Text>
          Promo Value:
        </Text>
        <Input
          disabled={!isEdit}
          inputStyle={[style.input]}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Price of Promotion"
          keyboardType="numeric"
          value={promo.discount + ''}
          leftIcon={<Icon name="attach-money" />}
          onChangeText={value => {
            setPriceChange(true)
            setPromo({ ...promo, discount: value })
          }}
        />
        <Text>
          Max Amount of Uses Per User:
        </Text>
        <View style={{ borderColor: '#DED7D7', zIndex: 10 }}>
          <DropDownPicker
            listMode="SCROLLVIEW"
            disabled={!isEdit}
            open={isOpen}
            value={maxUseValue}
            items={maxUseItems}
            setOpen={setIsOpen}
            setValue={setMaxUseValue}
            setItems={setMaxUseValue}
            onChangeValue={(value) => {
              setPromo({ ...promo, max_uses: value });
            }}
            style={[style.input, { marginBottom: 20 }]}
            placeholder="Max Uses per Customer"
            placeholderStyle={{
              color: "#8A949E",
              fontSize: 17.5
            }}
            textStyle={{
              fontSize: 17.5
            }}
            dropDownContainerStyle={{ borderColor: '#DED7D7' }}
          />
        </View>
        <Text>
          Campaign Budget:
        </Text>
        <Input
          disabled={!isEdit}
          inputStyle={style.input}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          placeholder="Campaign Budget"
          keyboardType="numeric"
          value={promo.budget + ''}
          leftIcon={<Icon name="attach-money" />}
          onChangeText={value => setPromo({ ...promo, budget: value })}
        />
        <Text>
          Promo Works On:
        </Text>
        <CheckBox
          disabled={!isEdit}
          checkedColor='#D65344'
          title="ENTIRE ORDER"
          checked={promo.order_id == 'entire_order'}
          onPress={() =>
            setPromo({
              ...promo,
              order_id: 'entire_order',
            })
          }
        />
        <CheckBox
          disabled={!isEdit}
          checkedColor='#D65344'
          title="SPECIFIC ITEMS"
          checked={promo.order_id != 'entire_order'}
          onPress={() =>
            setPromo({
              ...promo,
              order_id: promo.order_id == 'entire_order' ? '' : promo.order_id,
            })
          }
        />
        {promo.order_id != 'entire_order' && (
          <DropDownPicker
            listMode="SCROLLVIEW"
            mode="BADGE"
            disabled={!isEdit}
            open={isSpecificItemsOpen}
            value={specificItemsValue}
            items={specificItemsItems}
            setOpen={setSpecificItemsOpen}
            setValue={setSpecificItemsValue}
            setItems={setSpecificItemsItems}
            placeholder="Add Menu Item"
            multiple={true}
            min={1}
            searchable={true}
            searchPlaceholder="Search..."
            showBadgeDot={false}
            badgeColors={['#D65344']}
            style={[style.specificItemInput, { marginBottom: 20 }]}
            containerStyle={{
              alignItems: 'center',
              paddingLeft: '3%',
              paddingRight: '3%',
              marginTop: 5,
            }}
            dropDownContainerStyle={{
              borderColor: '#DED7D7',
              marginLeft: '3%',
            }}
            placeholderStyle={{
              color: "#8A949E",
              fontSize: 17.5
            }}
            textStyle={{
              fontSize: 17.5
            }}
            searchContainerStyle={{
              backgroundColor: "#F66B00",
              borderBottomColor: "white"
            }}
            searchTextInputStyle={{
              backgroundColor: "white",
              borderColor: "#F66B00"
            }}
            badgeTextStyle={{
              color: 'white',
              fontWeight: '500'
            }}
            searchPlaceholderTextColor="black"
          />
        )}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 15,
          }}>
          <Text style={{ marginRight: 15, flex: 1 }}>START DATE:</Text>
          <DateTimePicker
            disabled={!isEdit}
            title={'Select time'}
            mode={'date'}
            value={new Date(parseInt(promo.start_time))}
            onChange={d => {
              setPromo({
                ...promo,
                start_time: d.nativeEvent.timestamp,
              });
            }}
          />
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 15,
          }}>
          <Text style={{ marginRight: 15, flex: 1 }}>EXPIRATION DATE:</Text>
          <DateTimePicker
            disabled={!isEdit}
            title={'Select time'}
            mode={'date'}
            value={new Date(parseInt(promo.end_time))}
            onChange={d => {
              setPromo({
                ...promo,
                end_time: d.nativeEvent.timestamp,
              });
            }}
          />
        </View>
        {isEdit && <>
          {(promo.description == "" || promo.budget <= 0 || promo.discount <= 0 || promo.title == "" || maxUseValue == null)
            // {(promo.description == "" || (image == null && promo.content_id == "") || promo.budget <= 0 || promo.discount <= 0 || promo.title == "" || maxUseValue == null || promo.order_id == "")
            ? <Button
              title={`Save/${route.params.item ? 'Update' : 'Submit'}`}
              buttonStyle={{
                paddingTop: 15,
                paddingBottom: 15,
                marginTop: 50,
              }}
              disabled
            />
            :
            <Button
              title={`Save/${route.params.item ? 'Update' : 'Submit'}`}
              onPress={updatepromotion}
              buttonStyle={{
                backgroundColor: '#D65344',
                paddingTop: 15,
                paddingBottom: 15,
                marginTop: 24,
              }}
            />}
          {route.params.item && (
            <Button
              title="Delete Promotion"
              icon={{
                name: 'delete',
                color: '#fff',
              }}
              // iconContainerStyle={{ }}
              iconPosition='left'
              titleStyle={{ color: '#fff' }}
              buttonStyle={{
                backgroundColor: '#D65344',
                paddingTop: 15,
                paddingBottom: 15,
                marginTop: 24,
              }}
              onPress={removePromotion}
            />
          )}
        </>}
      </View>
      <Loading visible={loading} />
    </ScrollView>
  );
}

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
  specificItemInput: {
    backgroundColor: 'white',
    borderColor: '#DED7D7',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 11,
    paddingTop: 8,
    paddingBottom: 8
  },
  datetext: {
    color: 'blue',
    backgroundColor: 'grey',
  }
});

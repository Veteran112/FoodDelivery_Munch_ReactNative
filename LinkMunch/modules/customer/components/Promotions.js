import React, { useState, useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import moment from 'moment';
import md5 from 'md5';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Linking,
  Alert
} from 'react-native';
import Clipboard from '@react-native-community/clipboard'
import { Icon, Text, Card, Button } from 'react-native-elements';
import Share from 'react-native-share';
import Modal from 'react-native-modal';
import { RFValue } from 'react-native-responsive-fontsize';
import CartButton from './subcomponents/Cart/CartButton';
import { checkoutContext } from '../context/CheckoutContext';

const Stack = createStackNavigator();


export default function Promotion({ route }) {
  return (
    <Stack.Navigator initialRouteName="PromotionDisplay">
      <Stack.Screen
        name="PromotionDisplay"
        component={PromotionScreen}
        initialParams={{
          restaurantList: route.params.restaurants,
          profile: route.params.data,
          promos: route.params.promos,
        }}
        options={{
          headerTitleAlign: 'center',
          headerTitle: 'Promotions',
        }}
      />
    </Stack.Navigator>
  );
}

const PromotionScreen = ({ navigation, route }) => {

  let activeList = route.params.promos.filter(promo => promo.end_time >= (new Date()).getTime());
  let expList = route.params.promos.filter(promo => promo.end_time < (new Date()).getTime());
  let soldList = activeList.filter(promo => Math.floor(promo.budget / (promo.discount * 0.3)) < promo.total_purchased);
  activeList = activeList.filter(promo => Math.floor(promo.budget / (promo.discount * 0.3)) >= promo.total_purchased);
  activeList = activeList.sort((a, b) => a.end_time >= b.end_time);
  expList = expList.sort((a, b) => a.end_time < b.end_time);
  soldList = soldList.sort((a, b) => a.end_time < b.end_time);
  return (
    <>
      <ScrollView>
        {activeList && activeList.map(promo => {
          let restaurantName = route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)?.Profile.restaurantInfo?.restaurantName
          return (
            <PromotionScreenItem
              key={promo.promo_id}
              promotion={promo}
              profile={route.params.profile}
              rest_name={restaurantName ? restaurantName : ''}
              validity="active"
              curr_restaurant={route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)}
              navigation={navigation}
            />
          );
        })}
        {/* {soldList && soldList.map(promo => {
          let restrantName = route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)?.Profile.restaurantInfo?.restaurantName
          return (
            <PromotionScreenItem
              key={promo.promo_id}
              promotion={promo}
              profile={route.params.profile}
              rest_name={restrantName ? restrantName : ''}
              validity="sold"
              curr_restaurant={route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)}
              navigation={navigation}
            />
          );
        })} */}
        {/* {expList && expList.map(promo => {
          let restrantName = route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)?.Profile?.restaurantInfo?.restaurantName
          return (
            <PromotionScreenItem
              key={promo.promo_id}
              promotion={promo}
              profile={route.params.profile}
              rest_name={restrantName ? restrantName : ""}
              validity="expired"
              curr_restaurant={route.params.restaurantList.find(rest => rest.RestaurantId == promo.restaurant_id)}
              navigation={navigation}
            />
          );
        })} */}
      </ScrollView>
      
      <CartButton navigation={navigation} />
    </>
  );
};

const PromotionScreenItem = ({ promotion, profile, rest_name, validity, curr_restaurant, navigation }) => {
  const getCode = () => {
    return md5(
      promotion.restaurant_id +
      promotion.title +
      promotion.discount +
      profile.CustomerId,
    ).substr(0, 3);
  };

  const [visible, setVisible] = useState(false);

  const [shareVisble, setShareVisible] = useState(false);
  const cards = profile.paymentOptions.cards;
  const [select, setSelect] = useState('');

  const code = getCode();

  const [promoCode, setPromoCode] = useState('Loading ...')
  const [copiedText, setCopiedText] = useState('')


  const overuseAlert = () =>
    Alert.alert(
      "Promo Limit Reached",
      "You have reached the limit of purchasing this promotion.",
      [
        { text: "OK", onPress: () => console.log("OK Pressed") }
      ]
    );

  const copyToClipboard = () => {
    Clipboard.setString(promoCode)
    setCopiedText('Code Copied!')
  }

  const updateShare = async () => {
    try {
      let body = {
        'shareType': "share",
        'promo_id': promotion.promo_id,
        'username': profile.CustomerId,
      };
      const response = await fetch(
        'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/updateCustomerPromoUsage',
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
      let data = await response.json();
      setPromoCode(data['body']);
    } catch (e) {
      console.error('error', e);
    }
  };

  const { restaurant, setRestaurant, setRestaurantInfo, cartQuantity, setCartHasItem, setCartItems, setCartQuantity, promoItems, setPromoItems } = useContext(checkoutContext);

  return (
    <TouchableOpacity
      key={
        rest_name +
        '_' +
        promotion.promo_id
      }
      activeOpacity={1}
      style={{}}
    >
      <Card containerStyle={[styles.cardStyle, (validity != "active" && styles.expiredStyle)]}>

        <View style={styles.imageStyle}>
          <ImageBackground
            source={promotion.content_id && promotion.content_id != '' ? { uri: promotion.content_id } : null}
            resizeMode='cover'
            style={[styles.imageStyle, { height: 100 }]} // Change resize mode based on requirements
            imageStyle={styles.imageStyle}
          >
          </ImageBackground>
        </View>


        <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={styles.restaurantName}>
              {promotion.title}
            </Text>
            {(validity == "active" && (Math.floor(promotion.budget / (promotion.discount * 0.3))) != 0 && promotion.total_purchased / (Math.floor(promotion.budget / (promotion.discount * 0.3))) >= 0.75 &&
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Icon
                  name={'star'}
                  size={10}
                  color={'#F1695F'}
                  solid={true}
                  type={'font-awesome'}
                  style={{ paddingRight: 4 }}
                />
                <Text style={[styles.subtitleStyle, { fontWeight: 'bold', color: '#F1695F', fontStyle: 'italic' }]}>
                  Few Left!
                </Text>
              </View>)}
          </View>

          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={styles.subtitleStyle}>
              {rest_name}
            </Text>
            <Text style={styles.subtitleStyle}>
              Exp: {moment(new Date(parseInt(promotion.end_time))).format('MM/DD/YYYY')}
            </Text>
          </View>

          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={[styles.subtitleStyle, { color: '#F1695F', flex: 2 }]}>
              {promotion.description}
            </Text>
            <Text style={[styles.subtitleStyle, { color: '#F1695F', flex: 1, textAlign: 'right' }]}>
              {profile.Promotion === undefined ||
                profile.Promotion?.indexOf(code) === -1
                ? `$${promotion.discount} off ${promotion.order_id == 'entire_order' ? 'the Order!' : promotion.order_id
                }`
                : code}
            </Text>
          </View>
          {
            (validity == "sold")
              ? <View style={[styles.containerItem, { marginTop: 10, justifyContent: 'center' }]}>
                <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Sold Out</Text>
              </View>
              : (validity == "expired")
                ? <View style={[styles.containerItem, { marginTop: 10, justifyContent: 'center' }]}>
                  <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Expired</Text>
                </View>
                : 
                <View style={[styles.containerItem, {flexDirection: 'row', justifyContent: 'center', marginTop: 10 }]}>
                  <Button
                    buttonStyle={[styles.shareButtonStyle, { backgroundColor: '#e8e8e8' }]}
                    style={{ alignItems: 'center' }}
                    title="Share"
                    titleStyle={{ fontWeight: '500', color: 'black', }}
                    onPress={() => { setShareVisible(true); updateShare(); }}
                  />
                </View>
          }
        </View>
      </Card>
      <Modal
        isVisible={shareVisble}
        onBackdropPress={() => { setShareVisible(false); setCopiedText('') }}
        style={{ justifyContent: 'flex-end', margin: 0 }}>
        <View style={[styles.shareModalStyle]}>
          {!promotion.content_id
            ?
            <Text style={{
              textAlign: 'center', fontSize: 20, paddingTop: 30, fontStyle: 'italic',
            }}>{rest_name}</Text>
            :
            <View>
              <ImageBackground
                source={{ uri: promotion.content_id }}
                resizeMode='cover'
                style={[styles.imageStyle, { height: 150, padding: 2, justifyContent: 'flex-end' }]} // Change resize mode based on requirements
                imageStyle={[styles.imageStyle, { opacity: .8 }]}
              >
              </ImageBackground>
              <Text style={{
                textAlign: 'center', fontSize: 20, fontStyle: 'italic', paddingTop: 10,
              }}>{rest_name}</Text>
            </View>
          }

          <View style={{}}>
            <Text style={{ textAlign: 'center', fontSize: 22, padding: 10, fontWeight: 'bold' }}>{promotion.title}</Text>
            <Text style={{ textAlign: 'center', }}>
              Promotion Discount Price: ${promotion.discount}
            </Text>
            <Text style={{ textAlign: 'center' }}>Details: {promotion.description}</Text>
          </View>
          <View>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 20, marginTop: 30, fontWeight: 'bold' }}>Copy your Promo Code</Text>
          </View>
          <View>
            <TouchableOpacity
              style={{ borderWidth: 2, borderStyle: 'dotted', borderRadius: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, marginHorizontal: 50 }}
              onPress={() => copyToClipboard()}
            >
              {
                promoCode == 'Loading ...'
                  ? <Text style={{ textAlign: 'center', fontStyle: 'italic' }}>{promoCode}</Text>
                  : <Text style={{ textAlign: 'center', color: 'black' }}>{promoCode}</Text>
              }
            </TouchableOpacity>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 10, fontStyle: 'italic', color: '#8BBB81' }}>{copiedText}</Text>
          </View>
          <View>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 20, fontWeight: 'bold' }}>Share to Others!</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 20 }}>
              <TouchableOpacity
                style={{ borderWidth: 2, borderRightWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, borderTopLeftRadius: 15, borderBottomLeftRadius: 15 }}
                onPress={() =>
                  Linking.openURL(`http://facebook.com/`)
                }
              >
                <Icon
                  name={'social-facebook'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />

              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15 }}
                onPress={() =>
                  Linking.openURL(`http://instagram.com/`)
                }
              >
                <Icon
                  name={'social-instagram'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 2, borderLeftWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, borderTopRightRadius: 15, borderBottomRightRadius: 15 }}
                onPress={() =>
                  Share.open({
                    title:
                      promotion.title +
                      ' on ' +
                      rest_name,
                    message: promotion.description,
                  })
                }
              >
                <Icon
                  name={'options'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareModalStyle: {
    backgroundColor: '#f4f4f4',
    height: '80%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  restaurantName: {
    color: '#111C26',
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 5,
  },
  subtitleStyle: {
    color: '#888E94',
    fontSize: 14,
  },
  buttonStyle: {
    backgroundColor: '#E82800',
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center'
  },
  shareButtonStyle: {
    backgroundColor: '#E82800',
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5,
    minWidth: 200,
    alignItems: 'center'
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#03a5fc',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  promotionItem: {
    backgroundColor: 'white',
    marginBottom: 3,
    display: 'flex',
    flexDirection: 'row',
    padding: 5,
  },
  containerItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalInside: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 5,
    paddingTop: 15,
    paddingBottom: 15,
    borderTopRightRadius: 15,
    borderTopLeftRadius: 15,
  },
  cardcontainer: {
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#979797',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    marginLeft: 15,
    marginRight: 15,
  },
  check: {
    width: RFValue(30, 580),
    height: RFValue(30, 580),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RFValue(15, 580),
    borderWidth: 1,
    borderColor: '#F86D64',
  },
  cardStyle: {
    backgroundColor: '#ffffff',
    opacity: 1,
    shadowOpacity: 0,
    borderWidth: 0,
    padding: 0,
    margin: 30,
    borderRadius: 10,
    paddingBottom: 15,
  },
  imageStyle: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  expiredStyle: {
    opacity: 0.5,
  }
});

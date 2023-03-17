import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { AsyncStorage } from '@react-native-community/async-storage';
import { Icon, Input } from 'react-native-elements';
import RoundButton from "./RoundButton";
import React, { useContext, useState } from 'react';
import { checkoutContext } from '../../context/CheckoutContext';
import { timerContext } from "../../context/TimerContext"
import Images from '../../../theme/Images'

initialItemQuantity = 0;

export default function CustomizeItem(props) {
  
  const cartContext = useContext(checkoutContext);
  const [menuItems, setMenuItems] = useState([...props.route.params.menuItems]);
  const quantity = props.route.params.quantity;
  const key = props.route.params.item.key;
  const item = menuItems[key];
  const cartItem = cartContext.cartItems[key];
  const [instructions, setInstructions] = useState(...props.route.params.menuItems[key].instructions);
  const usedPromos = Object.keys(cartContext.usedPromos).length === 0 ? [] : cartContext.usedPromos
  const customerId = props.route.params.customerId
  const relevantUsedPromo = item.promo_id ? usedPromos.filter(up => up.hasOwnProperty(item.promo_id)) : []

  item.quantity = cartItem ? cartItem.quantity : 0

  const menuImage = item.picture ? { uri: item.picture } : Images.icon_food_placeholder;


  const onPlusQuantity = (item) => {
    let maxUses = !item.max_uses ? 9999 : relevantUsedPromo.length > 0 ? item.max_uses - relevantUsedPromo[0][item.promo_id].use_count : item.max_uses

    if (key >= 0 && item.quantity < maxUses) {
      menuItems[key].quantity++;
      setMenuItems([...menuItems]);
      let oldCartSize = cartContext.cartQuantity
      let newCartSize = cartContext.cartQuantity + 1
      cartContext.setCartQuantity(newCartSize);
      if (oldCartSize == 0 && newCartSize == 1) {
        cartContext.setCartHasItem(true);
      }
      if (item.item_type == 'promotions') {
        cartContext.setCartHasPromo(true);
        updatePromotionQuantities(item.promo_id, 1, customerId, true)
      }
      cartContext.setCartItems(menuItems);

      let newTime = 600
      cartContext.setTime(newTime)

    } else if (item.quantity >= maxUses) {

    }
  }

  const onSubtractQuantity = (item) => {
    if (key >= 0) {
      if (menuItems[key].quantity >= 1) {
        let menuItemsPromoQs = menuItems.filter(i => i.quantity > 0 && i.item_type == 'promotions').filter(i => i.item_name == item.item_name)

        if (!menuItemsPromoQs.isEmpty && item.quantity == 1) {
          cartContext.setCartHasPromo(false);
        }
        menuItems[key].quantity--;
        setMenuItems([...menuItems]);
        let newCartSize = cartContext.cartQuantity - 1
        cartContext.setCartQuantity(newCartSize);
        if (newCartSize == 0) {
          cartContext.setCartHasItem(false);
        }
        if (item.item_type == 'promotions') {
          updatePromotionQuantities(item.promo_id, 1, customerId, false)
        }
      }
      cartContext.setCartItems(menuItems);
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.general}>
        <View style={{ backgroundColor: '#fff', width: '90%', alignItems: 'center', marginTop: 10, marginBottom: 25, borderRadius: 5, paddingTop: 5, paddingBottom: 5 }}>
          {/* ITEM INFO SECTION */}
          <Text style={styles.itemHeading}>{item.item_name}</Text>
          <View style={styles.itemDescriptionImageContainer}>
            <Image style={styles.itemImage} source={menuImage} />
            <Text style={styles.itemDescription}>{item.item_description}</Text>
          </View>
        </View>

        {/* QUANTITY SECTION */}
        <View style={styles.quantityContainer}>
          <Text style={styles.sectionHeader}>Quantity</Text>
          <View style={styles.priceSelector}>
            <TouchableOpacity style={styles.priceBtn}
              onPress={() => onSubtractQuantity(item)}
            >
              <Text style={styles.priceBtnText}>-</Text>
            </TouchableOpacity>
            <View style={styles.priceBtn}>
              <Text style={[styles.priceBtnText, { fontSize: 16 }]}>{item.quantity}</Text>
            </View>
            <TouchableOpacity style={styles.priceBtn}
              onPress={() => onPlusQuantity(item)}
            >
              <Text style={styles.priceBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* INSTRUCTIONS SECTION */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.sectionHeader}>Instructions (Optional)</Text>
          <Input
            inputStyle={[styles.instructionsInput, {
              minHeight: 100,
              paddingLeft: 11,
              paddingTop: 8,
              paddingBottom: 8,
              paddingRight: 11,
            }]}
            inputContainerStyle={{ borderBottomWidth: 0, width: 300, left: -10 }}
            placeholder="Add instructions"
            numberOfLines={3}
            textAlignVertical="top"
            value={instructions}
            multiline={true}
            onChangeText={value => {
              setInstructions(value);
              if (key >= 0) {
                menuItems[key].instructions = value;
                setMenuItems([...menuItems]);
              }
            }}
          />
        </View>

        {/* FOOTER */}
        <View style={styles.footerWrapper}>
          <RoundButton
            theme={'main'}
            title={'SAVE'}
            style={[item.quantity > 0 ? { backgroundColor: '#fb322d' } : { backgroundColor: '#FB7B78' }, { borderRadius: 5 }]}
            onPress={() => {
              props.navigation.navigate('MyOrders', { menuItems: menuItems, })
            }}
            enabled={item.quantity > 0}
          />
        </View>
      </View>
    </ScrollView>
  )
}

async function updatePromotionQuantities(id, purchased, customer_id, operation) {
  let body = JSON.stringify({
    promo: {
      promo_id: id,
      total_purchased: purchased
    },
    incoming_id: customer_id,
    add: operation
  });
  let response;
  await fetch(
    'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/updatepromotionpurchases',
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
      body: body, // body data type must match “Content-Type” header
    },
  )
    .then(async res => {
      response = await res.json()
      console.log(response)
    })
    .catch(err => console.error('updatepromotionpurchases', err));
  return response;
}

const styles = StyleSheet.create({
  general: {
    alignItems: 'center',
    height: '100%',
  },
  itemHeading: {
    textAlign: 'center',
    color: '#313131',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 15,
  },
  itemDescriptionImageContainer: {
    alignItems: 'center',
    width: 300,
    marginTop: 20
  },
  itemImage: {
    width: 300,
    height: 200,
  },
  itemDescription: {
    marginTop: 20,
    marginBottom: 20,
    color: 'black',
    fontSize: 16
  },
  sectionHeader: {
    color: 'black',
    fontSize: 18,
    fontWeight: '600'
  },
  quantityContainer: {
    marginTop: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: 300,
  },
  priceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 10,
  },
  priceBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  priceBtnText: {
    color: '#7D849A',
    fontSize: 20
  },
  ingredientsContainer: {
    display: 'flex',
    width: 300,
    marginTop: 25,
    alignItems: 'flex-start',
  },
  instructionsContainer: {
    marginTop: 30,
    flex: 1,
    width: 300,
    alignItems: 'flex-start',
  },
  instructionsInput: {
    backgroundColor: 'white',
    borderColor: '#DED7D7',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 10,
  },
  footerWrapper: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#E2E2E2',
    width: '100%',
    marginTop: 10,
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
    marginTop: 20,
    flex: 2,
  },
  orderStatusButtons: {
    height: 50,
  },
  orderStatus: {
    color: '#242424',
    fontSize: 22,
    marginLeft: 10,
    textAlign: 'left',
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
  },
  orderItemCount: {
    marginTop: 10,
    marginLeft: 10,
    fontSize: 17,
    color: '#838383',
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderDetailsItemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
  },
  orderDetailsPrice: {
    textAlign: 'right',
    flex: 1,
    marginRight: 10,
    marginTop: 20,
  },
  orderDetailsSpecialInstructions: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 5,
    fontSize: 16,
    color: '#363636',
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderItemContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  orderDetailsItemName: {
    fontSize: 17,
    color: '#313131',
    marginLeft: 10,
  },
  orderItemPrice: {
    marginRight: 10,
    textAlign: 'right',
    fontSize: 17,
  },
  orderDetailsPrice: {
    textAlign: 'right',
    flex: 1,
    marginRight: 10,
    marginTop: 20,
  },
  orderTotalContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 5,
  },
});
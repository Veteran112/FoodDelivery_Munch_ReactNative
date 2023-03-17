import React, { Component, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image, Alert, TextInput } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { Icon, Button, Input } from 'react-native-elements';
import Images from '../../../../../theme/Images'
import { Auth } from 'aws-amplify';

export default class CategoryEditor extends React.Component {
  constructor(props) {
    super(props)
    this.navigation = props.navigation
    let menuCategoriesObjs = props.route.params.menuCategories.map((mc, index) => {
      return {
        key: mc.value,
        label: mc.label,
        value: mc.value
      }
    }
    )

    this.state = { menuCategories: menuCategoriesObjs, newMenuItemLabel: "", timeToClear: 0 };
  }

  componentDidMount() {
  }

  submitResult = async () => {
    let updatedData = this.state.menuCategories;
    console.log(updatedData)

    try {
      this.navigation.navigate('ItemEditor', { menuCategories: updatedData });
    } catch (e) {
      console.log(e);
    }
  };

  renderItem = ({ item, index, drag, isActive }) => {
    return (
      <>
        <TouchableOpacity
          style={[styles.menuCategory, { backgroundColor: isActive ? '#D65344' : '#F66B00' }]}
          onPressIn={drag}
        >
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center'
          }}>
            <View style={{ flex: 6, justifyContent: 'center' }}>
              <Text style={styles.menuCategoryText}>
                {item.label}
              </Text>
            </View>
            <View style={styles.menuCategoryButton}>
              <TouchableOpacity style={styles.editBtn} >
                <Button
                  icon={<Icon
                    name='edit'
                    type='material'
                    size={30}
                    color='#ffffff'
                    style={{ left: 0 }}
                    onPress={() => {
                      console.log('PRESSED2')
                    }}
                  />}
                  type='clear'
                />
              </TouchableOpacity>
            </View>
            <View style={styles.menuCategoryButton}>
              <TouchableOpacity onPress={() => {
                Alert.alert(
                  'Deleting Item',
                  'Are you sure you want to delete this item?',
                  [
                    {
                      text: 'Delete',
                      onPress: () => {
                        let newList = removeCategoryFromMenu(
                          item.label,
                          this.state.menuCategories
                        );
                        this.setState({ menuCategories: newList })
                      },
                    },
                    { text: 'Cancel' },
                  ],
                );
              }}>
                <Image
                  source={Images.icon_trash_white}
                  style={styles.trashIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  render() {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.headerSubtitleView}>
          <Text style={styles.headerSubtitle}>Hold and Drag to Change Order</Text>
        </View>
        <DraggableFlatList
          data={this.state.menuCategories}
          renderItem={this.renderItem}
          keyExtractor={(item, index) => {
            return item.key
          }}
          onDragEnd={({ data }) => {
            this.setState({ menuCategories: data })
            updateMenuCategories(data)
          }}
        />
        <View style={styles.submitNewCategoryText}>
          <Text style={styles.promoText}>
            Add New Category:
          </Text>
        </View>
        <View style={styles.submitNewCategory}>
          <TextInput
            key={this.state.timeToClear}
            style={{ width: 100, flex: 4, backgroundColor: 'white', marginRight: 10, borderWidth: 1, borderColor: 'black', borderRadius: 5, paddingLeft: 5, fontSize: 17, fontWeight: '600' }}
            type="text"
            returnKeyType="next"
            onChangeText={text => {
              this.setState({ newMenuItemLabel: text })
            }}
          />
          <TouchableOpacity
            rounded={true}
            enabled={this.state.newMenuItemLabel != "" ? true : false}
            style={{ backgroundColor: '#F66B00', borderRadius: 5, padding: 10, flex: 1, alignItems: 'center' }}
            onPress={() => {
              let newMenuCategories = addCategoryToMenu(this.state.newMenuItemLabel, this.state.menuCategories)
              this.state.timeToClear++
              this.setState({ menuCategories: newMenuCategories, newMenuItemLabel: "" })
            }}
          >
            <Text style={{ color: 'white', fontSize: 17, fontWeight: '600' }}>
              Submit
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          buttonStyle={[styles.buttonStyle, { marginBottom: 10 }]}
          title={`Save`}
          onPress={this.submitResult}
        />
      </View>
    );
  }
}


// add save button
// add 'add item' input? 
function removeCategoryFromMenu(categoryName, listOfCategories) {
  let items = listOfCategories.filter(
    category => category.label !== categoryName,
  );
  updateMenuCategories(items)
  return items;
}

function addCategoryToMenu(categoryName, listOfCategories) {
  let item = {
    "key": categoryName.toLowerCase(),
    "label": categoryName,
    "value": categoryName.toLowerCase()
  }
  listOfCategories.push(item)
  updateMenuCategories(listOfCategories)

  return listOfCategories;
}

async function updateMenuCategories(newLoMenuCategories) {
  let info = await Auth.currentUserInfo();
  // Default options are marked with *
  const body = JSON.stringify({
    'restaurant-id': info.attributes.sub,
    'menu-categories': JSON.stringify({ "categories": newLoMenuCategories }),
  });
  let token = null;
  let prom = Auth.currentSession().then(
    info => (token = info.getIdToken().getJwtToken()),
  );
  await prom;
  const response = await fetch(
    'https://9yl3ar8isd.execute-api.us-west-1.amazonaws.com/beta/restaurants/updatemenucategories',
    {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Authorization': token
        //'authToken': authenticationToken,
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: body, // body data type must match 'Content-Type' header
    },
  );
  let data = await response.json();
  console.log('data', data)

}

const styles = StyleSheet.create({
  headerSubtitleView: {
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#D65344',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'white',
    fontWeight: '600'
  },
  menuCategory: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    // borderWidth: 3,
    borderColor: '#36454F',
    marginLeft: 5,
    marginTop: 3,
    marginBottom: 3,
    marginRight: 5,
    borderRadius: 10,
  },
  menuCategoryText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 20,
    alignSelf: 'flex-start',
    paddingLeft: 15
  },
  menuCategoryButton: {
    flex: 1,
    borderLeftWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
  },
  editBtn: {
    alignSelf: 'center',
    resizeMode: 'contain',
    borderColor: 'white'
  },
  trashIcon: {
    width: 25,
    height: 25,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  promoText: {
    color: 'black',
    fontSize: 17,
    fontWeight: '600'
  },
  promoText2: {
    color: 'black',
    fontSize: 16,
    paddingLeft: 5
  },
  submitNewCategoryText: {
    marginTop: 20,
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 5
  },
  submitNewCategory: {
    paddingLeft: 10,
    paddingRight: 10,
    flexDirection: 'row',
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    borderRadius: 5,
    margin: 30

  },
})